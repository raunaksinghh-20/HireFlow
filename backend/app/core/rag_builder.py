"""
Vectorless RAG Context Builder
Assembles structured context directly into prompts — no vector DB needed.
"""


def build_interview_context(state: dict) -> dict:
    """Build context dict for interview question generation prompts."""
    conversation_history = state.get("conversation_history", [])
    formatted_history = _format_conversation(conversation_history)

    return {
        "resume_text": state.get("resume_text", ""),
        "jd_text": state.get("jd_text", ""),
        "required_skills": ", ".join(state.get("required_skills", [])),
        "ats_score": state.get("ats_score", 0),
        "skill_gaps": ", ".join(state.get("skill_gaps", [])),
        "matched_skills": ", ".join(state.get("matched_skills", [])),
        "difficulty_level": state.get("difficulty_level", 1),
        "question_count": state.get("question_count", 0),
        "questions_remaining": state.get("max_questions", 8) - state.get("question_count", 0),
        "conversation_history": formatted_history,
    }


def build_evaluation_context(
    resume_text: str,
    jd_text: str,
    required_skills: list,
    experience_years: int,
    ats_score: int,
    skill_gaps: list,
    transcript_turns: list,
) -> dict:
    """Build context dict for the evaluation prompt."""
    return {
        "resume_text": resume_text,
        "jd_text": jd_text,
        "required_skills": ", ".join(required_skills or []),
        "experience_years": experience_years,
        "ats_score": ats_score,
        "skill_gaps": ", ".join(skill_gaps or []),
        "formatted_transcript": _format_transcript(transcript_turns),
    }


def build_answer_analysis_context(state: dict, question: str, answer: str) -> dict:
    """Build context for the analyze_answer prompt."""
    parsed_sections = {}
    # Try to extract skills section from resume text
    resume_text = state.get("resume_text", "")
    skills = state.get("matched_skills", []) + state.get("skill_gaps", [])

    return {
        "job_title": state.get("job_title", ""),
        "question": question,
        "question_type": state.get("current_question_type", ""),
        "answer": answer,
        "resume_skills_section": ", ".join(skills) if skills else resume_text[:500],
    }


def _format_conversation(turns: list) -> str:
    """Format conversation history for prompt injection."""
    if not turns:
        return "No conversation yet."

    lines = []
    for turn in turns:
        role = turn.get("role", "unknown").upper()
        content = turn.get("content", "")
        q_type = turn.get("question_type", "")
        prefix = f"[{role}]"
        if q_type:
            prefix += f" ({q_type})"
        lines.append(f"{prefix}: {content}")

    return "\n\n".join(lines)


def _format_transcript(turns: list) -> str:
    """Format full transcript for evaluation prompt."""
    if not turns:
        return "No transcript available."

    lines = []
    for turn in turns:
        turn_num = turn.get("turn", 0)
        role = turn.get("role", "unknown")
        content = turn.get("content", "")
        score = turn.get("answer_score")

        if role == "interviewer":
            q_type = turn.get("question_type", "")
            diff = turn.get("difficulty", "")
            lines.append(f"--- Turn {turn_num} ---")
            lines.append(f"INTERVIEWER [{q_type}, difficulty: {diff}]: {content}")
        else:
            score_str = f" [Score: {score}/100]" if score is not None else ""
            lines.append(f"CANDIDATE{score_str}: {content}")

    return "\n".join(lines)
