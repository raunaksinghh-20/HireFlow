import re
from pathlib import Path


def extract_text_from_pdf(file_path: str) -> str:
    """
    Extract text from a PDF file.
    Primary: PyMuPDF (fitz) — fast, accurate.
    Fallback: PyPDF2.
    Raises ValueError if both fail or text is too short.
    """
    text = ""

    # Primary: PyMuPDF
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(file_path)
        for page in doc:
            text += page.get_text("text") + "\n"
        doc.close()
        if text.strip() and len(text.strip()) >= 50:
            return text.strip()
    except Exception:
        pass

    # Fallback: PyPDF2
    try:
        import PyPDF2
        from io import BytesIO
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        if text.strip() and len(text.strip()) >= 50:
            return text.strip()
    except Exception:
        pass

    if len(text.strip()) < 50:
        raise ValueError(
            "Could not extract sufficient text from PDF. "
            "The file may be scanned, image-based, or empty."
        )
    return text.strip()


def parse_resume_sections(text: str) -> dict:
    """
    Parse resume text into structured sections using regex pattern matching.
    Returns: { summary, skills:[], experience:[], education:[], projects:[], certifications:[], raw }
    """
    sections = {
        "summary": "",
        "skills": [],
        "experience": [],
        "education": [],
        "projects": [],
        "certifications": [],
        "raw": text,
    }

    lines = text.split("\n")
    current_section = "summary"

    # Section header patterns
    section_patterns = {
        "summary": re.compile(r"^(summary|objective|profile|about\s*me|professional\s*summary)", re.IGNORECASE),
        "skills": re.compile(r"^(skills|technologies|tech\s*stack|competencies|technical\s*skills)", re.IGNORECASE),
        "experience": re.compile(r"^(experience|work\s*history|employment|work\s*experience|professional\s*experience)", re.IGNORECASE),
        "education": re.compile(r"^(education|academic|qualifications|academic\s*background)", re.IGNORECASE),
        "projects": re.compile(r"^(projects|portfolio|personal\s*projects|key\s*projects)", re.IGNORECASE),
        "certifications": re.compile(r"^(certifications?|licenses?|awards?|achievements?)", re.IGNORECASE),
    }

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Check if this line is a section header
        matched_section = None
        for section_name, pattern in section_patterns.items():
            if pattern.match(stripped):
                matched_section = section_name
                break

        if matched_section:
            current_section = matched_section
            continue

        # Add content to current section
        if current_section == "skills":
            # Split skills by common delimiters
            skill_tokens = re.split(r"[,•|·/\t]+", stripped)
            for token in skill_tokens:
                token = token.strip().strip("-").strip("●").strip("▪").strip()
                if token and len(token) > 1 and len(token) < 50:
                    sections["skills"].append(token)
        elif current_section in ("experience", "education", "projects", "certifications"):
            sections[current_section].append(stripped)
        elif current_section == "summary":
            sections["summary"] += stripped + " "

    sections["summary"] = sections["summary"].strip()

    # Deduplicate skills
    seen = set()
    unique_skills = []
    for s in sections["skills"]:
        lower = s.lower()
        if lower not in seen:
            seen.add(lower)
            unique_skills.append(s)
    sections["skills"] = unique_skills

    return sections


def extract_candidate_email(text: str) -> str | None:
    """Extract the first email address found in text."""
    pattern = r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
    match = re.search(pattern, text)
    return match.group(0) if match else None


def get_parsed_sections_summary(parsed: dict) -> dict:
    """Get a summary of parsed sections for the upload response."""
    return {
        "skills_count": len(parsed.get("skills", [])),
        "experience_entries": len(parsed.get("experience", [])),
        "has_education": len(parsed.get("education", [])) > 0,
        "has_projects": len(parsed.get("projects", [])) > 0,
        "has_summary": bool(parsed.get("summary", "")),
        "has_certifications": len(parsed.get("certifications", [])) > 0,
    }
