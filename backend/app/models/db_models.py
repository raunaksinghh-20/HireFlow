import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, func
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.config.database import Base


# ══════════════════════════════════════════════════════════════════
# Users
# ══════════════════════════════════════════════════════════════════

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(20), default="candidate")  # candidate | recruiter | hr
    is_active = Column(Boolean, default=True)

    # Profile fields
    profile_picture = Column(String(500))  # file path to uploaded avatar
    phone = Column(String(30))
    bio = Column(Text)
    linkedin_url = Column(String(500))
    experience_years = Column(Integer, default=0)
    skills = Column(JSONB, default=list)  # ["Python", "React", ...]

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    jobs = relationship("Job", back_populates="owner", cascade="all, delete-orphan")
    resumes = relationship("Resume", back_populates="uploader")
    interviews = relationship("Interview", back_populates="creator")
    applications = relationship("Application", back_populates="candidate", cascade="all, delete-orphan")


# ══════════════════════════════════════════════════════════════════
# Applications (Candidate → Job)
# ══════════════════════════════════════════════════════════════════

class Application(Base):
    __tablename__ = "applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    resume_id = Column(UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True)

    # Status workflow: applied → screening → approved → interview_scheduled → interviewed → selected → rejected
    status = Column(String(30), default="applied")
    ats_score = Column(Integer)  # cached from Resume for quick access
    rejection_reason = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    candidate = relationship("User", back_populates="applications")
    job = relationship("Job", back_populates="applications")
    resume = relationship("Resume", back_populates="application")


# ══════════════════════════════════════════════════════════════════
# Jobs
# ══════════════════════════════════════════════════════════════════

class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    company = Column(String(255))
    description = Column(Text, nullable=False)
    required_skills = Column(JSONB, default=list)
    experience_years = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    owner = relationship("User", back_populates="jobs")
    resumes = relationship("Resume", back_populates="job", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="job")
    scheduled_interviews = relationship("ScheduledInterview", back_populates="job", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")


# ══════════════════════════════════════════════════════════════════
# Resumes
# ══════════════════════════════════════════════════════════════════

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    candidate_name = Column(String(255), nullable=False)
    candidate_email = Column(String(255))
    candidate_username = Column(String(255))
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size_kb = Column(Integer)

    # Extracted content (critical for vectorless RAG)
    extracted_text = Column(Text)
    parsed_sections = Column(JSONB)

    # ATS results (populated after /ats-score)
    ats_score = Column(Integer)
    skill_gaps = Column(JSONB, default=list)
    matched_skills = Column(JSONB, default=list)
    ranking_score = Column(Float)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    job = relationship("Job", back_populates="resumes")
    uploader = relationship("User", back_populates="resumes")
    interviews = relationship("Interview", back_populates="resume", cascade="all, delete-orphan")
    application = relationship("Application", back_populates="resume", uselist=False)


# ══════════════════════════════════════════════════════════════════
# Interviews
# ══════════════════════════════════════════════════════════════════

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resume_id = Column(UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    session_token = Column(String(255), unique=True)
    status = Column(String(20), default="pending")  # pending | active | completed | abandoned
    mode = Column(String(10), default="text")  # text | voice
    difficulty_level = Column(Integer, default=1)
    total_questions = Column(Integer, default=0)
    max_questions = Column(Integer, default=8)
    started_at = Column(DateTime(timezone=True))
    ended_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    resume = relationship("Resume", back_populates="interviews")
    job = relationship("Job", back_populates="interviews")
    creator = relationship("User", back_populates="interviews")
    transcript = relationship("Transcript", back_populates="interview", uselist=False, cascade="all, delete-orphan")
    evaluation = relationship("Evaluation", back_populates="interview", uselist=False, cascade="all, delete-orphan")


# ══════════════════════════════════════════════════════════════════
# Transcripts
# ══════════════════════════════════════════════════════════════════

class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    interview_id = Column(UUID(as_uuid=True), ForeignKey("interviews.id", ondelete="CASCADE"), unique=True, nullable=False)
    turns = Column(JSONB, default=list)
    raw_audio_path = Column(String(500))
    deepgram_meta = Column(JSONB)
    total_turns = Column(Integer, default=0)
    word_count = Column(Integer, default=0)
    duration_seconds = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    interview = relationship("Interview", back_populates="transcript")


# ══════════════════════════════════════════════════════════════════
# Evaluations
# ══════════════════════════════════════════════════════════════════

class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    interview_id = Column(UUID(as_uuid=True), ForeignKey("interviews.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Dimensional scores (0-100 each)
    technical_score = Column(Integer)
    communication_score = Column(Integer)
    consistency_score = Column(Integer)
    depth_score = Column(Integer)
    confidence_score = Column(Integer)

    # Weighted overall
    overall_score = Column(Float)

    # AI-generated structured results
    strengths = Column(JSONB, default=list)
    red_flags = Column(JSONB, default=list)
    skill_gap_confirmed = Column(JSONB, default=dict)
    hire_recommendation = Column(String(20))  # strong_yes | yes | maybe | no | strong_no
    summary_report = Column(Text)

    # Audit
    raw_llm_response = Column(JSONB)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    interview = relationship("Interview", back_populates="evaluation")


# ══════════════════════════════════════════════════════════════════
# Scheduled Interviews (Calendar Integration)
# ══════════════════════════════════════════════════════════════════

class ScheduledInterview(Base):
    __tablename__ = "scheduled_interviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    candidate_name = Column(String(255), nullable=False)
    candidate_username = Column(String(255), nullable=False)
    scheduled_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), default="pending")  # pending | completed | cancelled
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    job = relationship("Job", back_populates="scheduled_interviews")
