from uuid import UUID
from collections import Counter
from typing import List, Dict, Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.config.database import get_db
from app.api.dependencies import get_current_user
from app.models.db_models import User, Job, Resume, Interview, Evaluation, Application
from app.schemas.all_schemas import AnalyticsOverviewOut, SkillGapCount, RecommendationCount, CandidateAnalyticsOut

router = APIRouter(tags=["HR & Candidate Analytics"])


@router.get("/analytics/overview", response_model=AnalyticsOverviewOut)
async def get_analytics_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve aggregate analytics, average scores, and distributions across all jobs."""
    # 1. Counts
    jobs_count_res = await db.execute(select(func.count(Job.id)))
    jobs_count = jobs_count_res.scalar_one()

    resumes_count_res = await db.execute(select(func.count(Resume.id)))
    resumes_count = resumes_count_res.scalar_one()

    interviews_count_res = await db.execute(select(func.count(Interview.id)))
    interviews_count = interviews_count_res.scalar_one()

    # 2. Average ATS score
    avg_ats_res = await db.execute(select(func.avg(Resume.ats_score)).where(Resume.ats_score.isnot(None)))
    avg_ats = avg_ats_res.scalar() or 0.0

    # 3. Average Interview score
    avg_int_res = await db.execute(select(func.avg(Evaluation.overall_score)))
    avg_int = avg_int_res.scalar() or 0.0

    # 4. Recommendation distribution
    eval_result = await db.execute(select(Evaluation.hire_recommendation))
    recs = [r[0] for r in eval_result.all() if r[0]]
    rec_counts = Counter(recs)
    
    # Pre-populate all standard recommendations to make UI rendering consistent
    all_recommendations = ["strong_yes", "yes", "maybe", "no", "strong_no"]
    recommendation_distribution = [
        RecommendationCount(recommendation=rec, count=rec_counts.get(rec, 0))
        for rec in all_recommendations
    ]

    # 5. Skill Gaps frequency distribution
    resumes_result = await db.execute(select(Resume.skill_gaps).where(Resume.skill_gaps.isnot(None)))
    skill_gaps_lists = [r[0] for r in resumes_result.all()]
    
    all_gaps = []
    for gap_list in skill_gaps_lists:
        if isinstance(gap_list, list):
            all_gaps.extend(gap_list)
            
    gap_counts = Counter(all_gaps)
    # Get top 8 skill gaps
    skill_gap_distribution = [
        SkillGapCount(skill=skill, count=count)
        for skill, count in gap_counts.most_common(8)
    ]

    return AnalyticsOverviewOut(
        total_jobs=jobs_count,
        total_candidates=resumes_count,
        total_interviews=interviews_count,
        average_ats_score=round(float(avg_ats), 1),
        average_interview_score=round(float(avg_int), 1),
        recommendation_distribution=recommendation_distribution,
        skill_gap_distribution=skill_gap_distribution,
    )


@router.get("/analytics/candidate", response_model=CandidateAnalyticsOut)
async def get_candidate_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve personal performance analytics for a candidate."""
    # 1. Total applications
    app_result = await db.execute(
        select(Application).where(Application.candidate_id == current_user.id)
    )
    applications = app_result.scalars().all()

    total_apps = len(applications)

    # Statuses
    shortlisted = 0
    rejected = 0
    interviewed = 0

    status_counts = Counter()
    for app in applications:
        status_counts[app.status] += 1
        if app.status in ("approved", "interview_scheduled", "interviewed", "selected"):
            shortlisted += 1
        if app.status == "rejected":
            rejected += 1
        if app.status in ("interviewed", "selected"):
            interviewed += 1

    # 2. Interview scores and trends
    query = (
        select(Evaluation.overall_score, Interview.created_at, Job.title)
        .join(Interview, Evaluation.interview_id == Interview.id)
        .join(Job, Interview.job_id == Job.id)
        .join(Resume, Interview.resume_id == Resume.id)
        .where(
            (Resume.uploaded_by == current_user.id) |
            (Resume.candidate_email == current_user.email)
        )
        .order_by(Interview.created_at.asc())
    )
    eval_res = await db.execute(query)
    eval_rows = eval_res.all()

    interview_scores_trend = []
    total_score = 0.0
    for score, created_at, title in eval_rows:
        total_score += score
        interview_scores_trend.append({
            "date": created_at.strftime("%Y-%m-%d"),
            "score": round(score, 1),
            "job_title": title
        })

    avg_score = (total_score / len(eval_rows)) if eval_rows else 0.0

    return CandidateAnalyticsOut(
        total_applications=total_apps,
        shortlisted_count=shortlisted,
        rejected_count=rejected,
        interviewed_count=len(eval_rows),
        average_interview_score=round(avg_score, 1),
        application_status_distribution=dict(status_counts),
        interview_scores_trend=interview_scores_trend,
    )

