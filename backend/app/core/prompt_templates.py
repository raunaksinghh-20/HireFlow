# ══════════════════════════════════════════════════════════════════
# AI Prompt Templates — Versioned, Single Source of Truth
# ══════════════════════════════════════════════════════════════════
# Never inline prompts in service files. All LLM prompts live here.

FIRST_QUESTION_PROMPT = """You are an expert technical interviewer conducting a structured job interview.

CANDIDATE RESUME:
{resume_text}

JOB DESCRIPTION:
{jd_text}

REQUIRED SKILLS: {required_skills}
ATS MATCH SCORE: {ats_score}/100
SKILL GAPS IDENTIFIED: {skill_gaps}

Your task: Generate the FIRST interview question.

Rules:
- Start with a technical question directly related to the candidate's primary claimed skill
- Difficulty level: {difficulty_level}/5 (1=beginner, 5=expert)
- The question should be open-ended and require a specific, demonstrable answer
- Do NOT ask about their name, role, or introduce yourself
- Focus on the skill most relevant to the job that the candidate claims to have

Respond ONLY with a JSON object:
{{
  "question": "your question here",
  "question_type": "technical_opening",
  "target_skill": "skill being tested"
}}"""


ANALYZE_ANSWER_PROMPT = """You are evaluating a candidate's answer in a technical interview.

JOB BEING INTERVIEWED FOR: {job_title}
QUESTION ASKED: {question}
QUESTION TYPE: {question_type}
CANDIDATE'S ANSWER: {answer}

RESUME CONTEXT (what they claim to know):
{resume_skills_section}

Evaluate this answer on the following:

1. answer_quality: One of "shallow", "adequate", "strong"
   - shallow: Vague, generic, no specifics, buzzword-heavy, contradicts resume
   - adequate: Shows basic understanding, some specifics, mostly correct
   - strong: Demonstrates deep understanding, specific examples, goes beyond the question

2. answer_score: Integer 0-100

3. routing_decision: One of:
   - "follow_up": Answer was shallow or adequate — drill deeper on the same topic
   - "gap_probe": Good answer but this topic relates to an identified skill gap — probe it
   - "challenge": Answer contradicts their resume claim — challenge the inconsistency
   - "escalate": Strong answer — increase difficulty and move to harder concept
   - "next_topic": Adequate answer, move to next planned topic
   - "complete": Interview has gathered enough signal (only use if question_count >= max_questions - 1)

4. detected_issues: List of strings describing any problems found (empty list if none)

Respond ONLY with valid JSON:
{{
  "answer_quality": "...",
  "answer_score": 0,
  "routing_decision": "...",
  "detected_issues": []
}}"""


NEXT_QUESTION_PROMPT = """You are generating the next interview question based on how the candidate just answered.

CONVERSATION SO FAR:
{conversation_history}

ROUTING DECISION: {routing_decision}
CURRENT DIFFICULTY LEVEL: {difficulty_level}/5
SKILL GAPS TO PROBE: {skill_gaps}
QUESTIONS ASKED SO FAR: {question_count}
QUESTIONS REMAINING: {questions_remaining}

Generate the next question following this routing logic:
- follow_up: Probe deeper into the same topic. Ask for a specific example or edge case.
- gap_probe: Pivot to one of the unaddressed skill gaps from the list. Start at difficulty 2.
- challenge: The candidate's previous answer contradicted their resume. Directly but professionally challenge it.
  Example: "Your resume mentions X years of experience with Docker. Could you walk me through a specific Dockerfile you've written?"
- escalate: The candidate is strong. Ask a harder, more architectural or system-design question on the same topic.
- next_topic: Move to a fresh topic from the job requirements not yet covered.

Rules:
- Never repeat a question already asked
- Keep questions open-ended
- Do not provide hints or examples in the question itself
- Adjust complexity to match difficulty_level

Respond ONLY with valid JSON:
{{
  "question": "your question here",
  "question_type": "{routing_decision}",
  "difficulty_change": 0,
  "target_skill": "skill being tested"
}}"""


EVALUATION_PROMPT = """You are a senior technical recruiter and organizational psychologist evaluating a completed job interview.

═══ CANDIDATE RESUME ═══
{resume_text}

═══ JOB DESCRIPTION ═══
{jd_text}

═══ JOB REQUIREMENTS ═══
Required Skills: {required_skills}
Required Experience: {experience_years} years
ATS Score (pre-interview): {ats_score}/100
Identified Skill Gaps: {skill_gaps}

═══ FULL INTERVIEW TRANSCRIPT ═══
{formatted_transcript}

═══ YOUR TASK ═══
Produce a comprehensive evaluation. Base ALL conclusions on specific evidence from the transcript.
Do not invent or assume anything not present in the conversation.

Evaluate across exactly these 5 dimensions (each 0–100):

1. technical_score: Accuracy and depth of technical answers
2. communication_score: Clarity, structure, conciseness of responses
3. consistency_score: How well answers align with resume claims (inconsistencies lower this)
4. depth_score: Surface-level parroting vs. genuine demonstrated understanding
5. confidence_score: Certainty and assertiveness vs. excessive hedging

Also provide:
- strengths: 3–5 specific strengths WITH transcript evidence
- red_flags: 0–5 concerns WITH evidence
- skill_gap_confirmed: For each skill gap identified pre-interview, state "confirmed" (candidate lacks it), "denied" (candidate demonstrated it), or "unclear"
- hire_recommendation: Exactly one of "strong_yes", "yes", "maybe", "no", "strong_no"
- summary_report: 3-paragraph manager-ready narrative

Respond ONLY with valid JSON:
{{
  "technical_score": 0,
  "communication_score": 0,
  "consistency_score": 0,
  "depth_score": 0,
  "confidence_score": 0,
  "strengths": [],
  "red_flags": [],
  "skill_gap_confirmed": {{}},
  "hire_recommendation": "...",
  "summary_report": "..."
}}"""
