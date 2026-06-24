import json
import logging
from pydantic import BaseModel, Field
from typing import List, Optional
from app.core.llm_client import generate_text

logger = logging.getLogger(__name__)

class ProjectSummary(BaseModel):
    title: str
    description: str
    tech_stack: List[str] = Field(default_factory=list)

class StructuredResume(BaseModel):
    name: str
    total_experience_years: float
    education: List[str] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    projects: List[ProjectSummary] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    raw_text: str

class StructuredJD(BaseModel):
    role: str
    required_skills: List[str] = Field(default_factory=list)
    good_to_have: List[str] = Field(default_factory=list)
    min_experience_years: float
    responsibilities: List[str] = Field(default_factory=list)
    raw_text: str


async def parse_resume_to_structured(text: str, candidate_name: str = "Candidate") -> dict:
    """Uses LLM to parse raw resume text into a structured JSON representation."""
    prompt = f"""You are an expert resume parser. Extract structured information from the following resume.
Return ONLY valid JSON matching this schema exactly:
{{
    "name": "Candidate's full name",
    "total_experience_years": 0.0,
    "education": ["degree, university"],
    "skills": ["skill1", "skill2"],
    "projects": [
        {{
            "title": "Project Title",
            "description": "Short description of what they built",
            "tech_stack": ["React", "Python"]
        }}
    ],
    "certifications": ["certification name"]
}}

Rules:
1. Estimate total_experience_years as a float (e.g. 3.5 years).
2. Clean and group skills to standard terms (e.g., "PostgreSQL" rather than "Postgres database").
3. Make sure to capture key technical stack used in projects.
4. Output ONLY the JSON block. Do not include markdown code blocks.

RESUME TEXT:
{text}
"""
    try:
        response = await generate_text(prompt, temperature=0.1)
        response = response.strip()
        if response.startswith("```"):
            response = response.split("```")[1]
            if response.startswith("json"):
                response = response[4:]
            response = response.split("```")[0]
        
        data = json.loads(response.strip())
        # Ensure raw text is attached
        data["raw_text"] = text
        if not data.get("name") or data["name"] == "Candidate's full name":
            data["name"] = candidate_name
        
        # Validate with pydantic
        parsed = StructuredResume(**data)
        return parsed.model_dump()
    except Exception as e:
        logger.error(f"Error parsing resume structured content via LLM: {e}")
        # Return fallback dictionary
        return {
            "name": candidate_name,
            "total_experience_years": 0.0,
            "education": [],
            "skills": [],
            "projects": [],
            "certifications": [],
            "raw_text": text
        }


async def parse_jd_to_structured(text: str, role_title: str = "Software Engineer") -> dict:
    """Uses LLM to parse raw Job Description text into a structured JSON representation."""
    prompt = f"""You are an expert recruiter. Extract structured requirements from this Job Description (JD).
Return ONLY valid JSON matching this schema exactly:
{{
    "role": "Role Title",
    "required_skills": ["essential skill 1", "essential skill 2"],
    "good_to_have": ["nice to have skill 1"],
    "min_experience_years": 0.0,
    "responsibilities": ["key responsibility 1", "key responsibility 2"]
}}

Rules:
1. Estimate minimum experience years required as a float.
2. Separate essential required skills from nice-to-have skills.
3. Output ONLY the JSON block. Do not include markdown code blocks.

JOB DESCRIPTION:
{text}
"""
    try:
        response = await generate_text(prompt, temperature=0.1)
        response = response.strip()
        if response.startswith("```"):
            response = response.split("```")[1]
            if response.startswith("json"):
                response = response[4:]
            response = response.split("```")[0]
        
        data = json.loads(response.strip())
        data["raw_text"] = text
        if not data.get("role"):
            data["role"] = role_title
        
        parsed = StructuredJD(**data)
        return parsed.model_dump()
    except Exception as e:
        logger.error(f"Error parsing JD structured content via LLM: {e}")
        return {
            "role": role_title,
            "required_skills": [],
            "good_to_have": [],
            "min_experience_years": 0.0,
            "responsibilities": [],
            "raw_text": text
        }
