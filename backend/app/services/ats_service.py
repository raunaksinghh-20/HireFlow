import re
from app.models.db_models import Resume, Job


# Common English stopwords to exclude from keyword matching
STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
    "with", "by", "from", "as", "is", "was", "are", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
    "may", "might", "shall", "can", "need", "must", "it", "its", "this", "that",
    "these", "those", "i", "me", "my", "we", "our", "you", "your", "he", "she",
    "him", "her", "his", "they", "them", "their", "what", "which", "who", "whom",
    "where", "when", "how", "why", "all", "each", "every", "both", "few", "more",
    "most", "other", "some", "such", "no", "not", "only", "same", "so", "than",
    "too", "very", "just", "about", "above", "after", "again", "also", "any",
    "because", "before", "between", "during", "into", "through", "under", "until",
    "up", "down", "out", "over", "then", "once", "here", "there", "if", "while",
    "able", "work", "working", "experience", "role", "looking", "team", "using",
    "etc", "including", "well", "strong", "good", "great", "new", "years", "year",
}


def calculate_ats_score(resume: Resume, job: Job) -> dict:
    """
    Pure Python ATS scoring. No AI call needed — keeps it fast.

    Scoring formula:
    1. skills_score  (weight: 50%) — skill match ratio
    2. keyword_score (weight: 30%) — JD keyword presence in resume
    3. experience_score (weight: 20%) — years of experience match

    Returns full scoring breakdown.
    """
    resume_text = (resume.extracted_text or "").lower()
    parsed = resume.parsed_sections or {}
    resume_skills = [s.lower().strip() for s in parsed.get("skills", [])]

    required_skills = [s.lower().strip() for s in (job.required_skills or [])]
    jd_text = (job.description or "").lower()

    # ── 1. Skills Score (50% weight) ────────────────────────────
    if required_skills:
        matched = []
        gaps = []
        for skill in required_skills:
            # Check if skill appears in resume skills list or in full resume text
            if skill in resume_skills or skill in resume_text:
                matched.append(skill)
            else:
                # Try partial match for multi-word skills
                skill_words = skill.split()
                if len(skill_words) > 1 and all(w in resume_text for w in skill_words):
                    matched.append(skill)
                else:
                    gaps.append(skill)
        skills_score = (len(matched) / len(required_skills)) * 100 if required_skills else 0
    else:
        matched = []
        gaps = []
        skills_score = 50  # Neutral if no skills specified

    # ── 2. Keyword Score (30% weight) ───────────────────────────
    jd_words = set(re.findall(r"\b[a-z]{3,}\b", jd_text))
    jd_keywords = jd_words - STOPWORDS

    if jd_keywords:
        keyword_matches = sum(1 for kw in jd_keywords if kw in resume_text)
        keyword_score = (keyword_matches / len(jd_keywords)) * 100
    else:
        keyword_score = 50

    # ── 3. Experience Score (20% weight) ─────────────────────────
    required_years = job.experience_years or 0
    candidate_years = _extract_years_of_experience(resume_text)

    if required_years == 0:
        experience_score = 100
        experience_match = True
    elif candidate_years >= required_years:
        experience_score = 100
        experience_match = True
    elif candidate_years >= required_years * 0.75:
        experience_score = 75
        experience_match = True
    else:
        experience_score = (candidate_years / required_years) * 100 if required_years > 0 else 0
        experience_match = False

    # ── Composite Score ──────────────────────────────────────────
    ranking_score = (skills_score * 0.5) + (keyword_score * 0.3) + (experience_score * 0.2)
    ats_score = min(100, max(0, int(ranking_score)))

    # Preserve original case for display
    original_required = {s.lower(): s for s in (job.required_skills or [])}
    matched_display = [original_required.get(m, m) for m in matched]
    gaps_display = [original_required.get(g, g) for g in gaps]

    # Generate recommendation
    if ats_score >= 80:
        recommendation = "Strong match. Candidate meets most requirements."
    elif ats_score >= 60:
        recommendation = f"Good match. Missing skills: {', '.join(gaps_display[:3])}." if gaps_display else "Good match."
    elif ats_score >= 40:
        recommendation = f"Partial match. Significant skill gaps: {', '.join(gaps_display[:3])}."
    else:
        recommendation = "Weak match. Candidate lacks most required skills."

    return {
        "ats_score": ats_score,
        "matched_skills": matched_display,
        "skill_gaps": gaps_display,
        "ranking_score": round(ranking_score, 1),
        "match_percentage": round(ranking_score, 1),
        "experience_match": experience_match,
        "recommendation": recommendation,
        "breakdown": {
            "skills_score": round(skills_score, 1),
            "keyword_score": round(keyword_score, 1),
            "experience_score": round(experience_score, 1),
        },
    }


def _extract_years_of_experience(text: str) -> int:
    """Extract years of experience from resume text via regex."""
    patterns = [
        r"(\d+)\+?\s*years?\s*(?:of\s+)?(?:experience|exp)",
        r"(\d+)\+?\s*years?\s*(?:in|of|working)",
        r"experience\s*(?:of\s+)?(\d+)\+?\s*years?",
    ]
    max_years = 0
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for m in matches:
            try:
                years = int(m)
                if years <= 50:  # Sanity check
                    max_years = max(max_years, years)
            except ValueError:
                continue
    return max_years
