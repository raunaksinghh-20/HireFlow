from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from typing import Optional, List, Dict, Any
from datetime import datetime


# ══════════════════════════════════════════════════════════════════
# Auth Schemas
# ══════════════════════════════════════════════════════════════════

class UserCreate(BaseModel):
    username: str = Field(min_length=3)
    email: Optional[EmailStr] = None
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=1)
    role: Optional[str] = "candidate"  # candidate | recruiter | hr


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: UUID
    username: str
    email: Optional[str] = None
    full_name: str
    role: str
    profile_picture: Optional[str] = None


class UserOut(BaseModel):
    id: UUID
    username: str
    email: Optional[str] = None
    full_name: str
    role: str
    profile_picture: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════════
# Job Schemas
# ══════════════════════════════════════════════════════════════════

class JobCreate(BaseModel):
    title: str = Field(min_length=1)
    company: Optional[str] = None
    description: str = Field(min_length=10)
    required_skills: List[str] = Field(default_factory=list)
    experience_years: int = Field(default=0, ge=0)
    vacant_positions: int = Field(default=1, ge=1)
    application_deadline: Optional[datetime] = None


class JobUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1)
    company: Optional[str] = None
    description: Optional[str] = Field(None, min_length=10)
    required_skills: Optional[List[str]] = None
    experience_years: Optional[int] = Field(None, ge=0)
    vacant_positions: Optional[int] = Field(None, ge=1)
    application_deadline: Optional[datetime] = None


class JobOut(BaseModel):
    id: UUID
    owner_id: UUID
    title: str
    company: Optional[str] = None
    description: str
    required_skills: List[str] = []
    experience_years: int = 0
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════════
# Resume Schemas
# ══════════════════════════════════════════════════════════════════

class ResumeUploadResponse(BaseModel):
    resume_id: UUID
    candidate_name: str
    candidate_email: Optional[str] = None
    job_id: UUID
    file_name: str
    file_size_kb: int
    extracted_text_preview: str
    parsed_sections: Dict[str, Any]
    message: str = "Resume uploaded. Run /ats-score to score this candidate."


class ResumeOut(BaseModel):
    id: UUID
    job_id: UUID
    candidate_name: str
    candidate_email: Optional[str] = None
    file_name: str
    file_size_kb: Optional[int] = None
    extracted_text: Optional[str] = None
    parsed_sections: Optional[Dict[str, Any]] = None
    ats_score: Optional[int] = None
    skill_gaps: Optional[List[str]] = None
    matched_skills: Optional[List[str]] = None
    ranking_score: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════════
# ATS Schemas
# ══════════════════════════════════════════════════════════════════

class ATSScoreRequest(BaseModel):
    resume_id: UUID


class ATSBreakdown(BaseModel):
    skills_score: float
    experience_score: float
    keyword_score: float


class ATSScoreResponse(BaseModel):
    resume_id: UUID
    candidate_name: str
    ats_score: int
    matched_skills: List[str]
    skill_gaps: List[str]
    match_percentage: float
    experience_match: bool
    ranking_score: float
    recommendation: str
    breakdown: ATSBreakdown


class RankedCandidateOut(BaseModel):
    rank: int
    resume_id: Optional[UUID] = None
    candidate_id: Optional[UUID] = None
    candidate_name: str
    candidate_email: Optional[str] = None
    ats_score: Optional[int] = None
    ranking_score: float
    matched_skills: List[str] = []
    skill_gaps: List[str] = []


# ══════════════════════════════════════════════════════════════════
# Interview Schemas
# ══════════════════════════════════════════════════════════════════

class StartInterviewRequest(BaseModel):
    resume_id: UUID
    job_id: UUID
    mode: str = "text"
    max_questions: int = Field(default=8, ge=3, le=15)


class StartInterviewResponse(BaseModel):
    interview_id: UUID
    session_token: str
    first_question: str
    question_type: str
    difficulty_level: int
    candidate_name: str
    job_title: str
    total_questions_planned: int
    message: str = "Interview started. Submit answers to /transcript."
    audio_base64: Optional[str] = None


class SubmitAnswerRequest(BaseModel):
    session_token: str
    answer: str = Field(min_length=1)
    turn: int


class SubmitAnswerResponse(BaseModel):
    turn: int
    answer_received: bool = True
    answer_quality: Optional[str] = None
    next_question: Optional[str] = None
    question_type: Optional[str] = None
    difficulty_level: int
    interview_complete: bool
    questions_remaining: int
    message: str
    transcribed_text: Optional[str] = None
    audio_base64: Optional[str] = None


class QuitInterviewRequest(BaseModel):
    session_token: str


class QuitInterviewResponse(BaseModel):
    interview_id: UUID
    interview_complete: bool = True
    message: str = "Interview ended. Generate the candidate evaluation from current progress."


class RescheduleRequest(BaseModel):
    job_id: UUID
    resume_id: UUID


# ══════════════════════════════════════════════════════════════════
# Transcript Schemas
# ══════════════════════════════════════════════════════════════════

class TranscriptTurnOut(BaseModel):
    turn: int
    role: str
    content: str
    question_type: Optional[str] = None
    difficulty: Optional[int] = None
    answer_score: Optional[int] = None
    timestamp: Optional[str] = None


class TranscriptOut(BaseModel):
    transcript_id: UUID
    interview_id: UUID
    candidate_name: str
    job_title: str
    status: str
    turns: List[TranscriptTurnOut] = []
    total_turns: int = 0
    word_count: int = 0
    duration_seconds: int = 0
    created_at: datetime


# ══════════════════════════════════════════════════════════════════
# Evaluation Schemas
# ══════════════════════════════════════════════════════════════════

class EvaluationRequest(BaseModel):
    interview_id: UUID


class EvaluationOut(BaseModel):
    evaluation_id: UUID
    interview_id: UUID
    candidate_name: str
    job_title: str
    technical_score: int
    communication_score: int
    consistency_score: int
    depth_score: int
    confidence_score: int
    overall_score: float
    strengths: List[str] = []
    red_flags: List[str] = []
    skill_gap_confirmed: Dict[str, str] = {}
    hire_recommendation: str
    summary_report: str
    created_at: datetime

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════════
# Scheduled Interview Schemas
# ══════════════════════════════════════════════════════════════════

class ScheduledInterviewCreate(BaseModel):
    job_id: UUID
    candidate_name: str
    candidate_username: str
    scheduled_time: datetime


class ScheduledInterviewOut(BaseModel):
    id: UUID
    job_id: UUID
    candidate_name: str
    candidate_username: str
    scheduled_time: datetime
    status: str
    created_at: datetime
    job_title: Optional[str] = None
    company: Optional[str] = None
    resume_id: Optional[UUID] = None

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════════
# Analytics Schemas
# ══════════════════════════════════════════════════════════════════

class SkillGapCount(BaseModel):
    skill: str
    count: int


class RecommendationCount(BaseModel):
    recommendation: str
    count: int


class AnalyticsOverviewOut(BaseModel):
    total_jobs: int
    total_candidates: int
    total_interviews: int
    average_ats_score: float
    average_interview_score: float
    recommendation_distribution: List[RecommendationCount]
    skill_gap_distribution: List[SkillGapCount]


# ══════════════════════════════════════════════════════════════════
# Profile Schemas
# ══════════════════════════════════════════════════════════════════

class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    experience_years: Optional[int] = None
    skills: Optional[List[str]] = None


class UserProfileOut(BaseModel):
    id: UUID
    username: str
    email: Optional[str] = None
    full_name: str
    role: str
    profile_picture: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    experience_years: int = 0
    skills: List[str] = []
    access_token: Optional[str] = None
    expires_in: Optional[int] = None

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════════
# Application Schemas
# ══════════════════════════════════════════════════════════════════

class ApplicationCreate(BaseModel):
    job_id: UUID
    resume_id: Optional[UUID] = None


class ApplicationUpdateStatus(BaseModel):
    status: str
    rejection_reason: Optional[str] = None


class ApplicationOut(BaseModel):
    id: UUID
    candidate_id: UUID
    job_id: UUID
    resume_id: Optional[UUID] = None
    status: str
    ats_score: Optional[int] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    job_title: Optional[str] = None
    company: Optional[str] = None
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════════
# Candidate Analytics Schemas
# ══════════════════════════════════════════════════════════════════

class CandidateAnalyticsOut(BaseModel):
    total_applications: int
    shortlisted_count: int
    rejected_count: int
    interviewed_count: int
    average_interview_score: float
    application_status_distribution: Dict[str, int]
    interview_scores_trend: List[Dict[str, Any]]


# ══════════════════════════════════════════════════════════════════
# Interview Listing Schema
# ══════════════════════════════════════════════════════════════════

class InterviewOut(BaseModel):
    id: UUID
    resume_id: UUID
    job_id: UUID
    job_title: str
    company: str
    candidate_name: str
    candidate_email: str
    status: str
    mode: str
    created_at: datetime
    evaluation_score: Optional[float] = None
    evaluation: Optional[EvaluationOut] = None

    class Config:
        from_attributes = True


