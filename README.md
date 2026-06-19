# HireFlow-AI

HireFlow-AI is an end-to-end AI recruitment platform for candidates, recruiters, and HR teams. It supports job posting, resume upload and parsing, deterministic ATS scoring, candidate ranking, adaptive AI interviews, transcript storage, multi-agent interview evaluation, application tracking, scheduling, and analytics.

## Features

- **Role-based workflows**: Separate candidate and recruiter/HR dashboards with protected routes.
- **Job management**: Recruiters can create, update, list, and soft-delete job postings.
- **Resume processing**: PDF uploads are validated, stored, text-extracted, and parsed into structured sections.
- **Deterministic ATS scoring**: Candidates are scored with an explainable formula based on required skills, JD keyword overlap, and years of experience.
- **Candidate ranking**: Scored resumes are ranked by `ranking_score` for each job.
- **Application tracking**: Candidates can apply to jobs, while recruiters/HR can review and update application status.
- **Adaptive AI interviews**: Gemini generates interview questions using resume text, job description, ATS score, skill gaps, matched skills, and conversation history.
- **Vectorless RAG context**: The system injects relevant resume/JD/interview context directly into prompts instead of using a vector database.
- **Voice interview support**: Deepgram powers speech-to-text for candidate answers and text-to-speech for AI questions.
- **Transcript persistence**: Interview turns are saved in PostgreSQL as JSONB transcript records.
- **Multi-agent evaluation**: Gemini runs technical, communication, and HR/integrity evaluations, then synthesizes a final recommendation.
- **Analytics**: Recruiter dashboards show aggregate ATS/interview insights; candidates can view personal application and interview performance.
- **Profile management**: Users can update profile details and upload profile pictures.

## Tech Stack

### Frontend

- React
- Vite
- Tailwind CSS
- React Router
- Zustand
- Axios
- Lucide Icons
- Recharts
- React Hook Form

### Backend

- FastAPI
- Async SQLAlchemy
- PostgreSQL
- Redis
- Pydantic
- JWT auth with bcrypt password hashing
- PyMuPDF with PyPDF2 fallback for resume text extraction

### AI and Audio

- Google GenAI SDK using `gemini-2.5-flash-lite`
- Deepgram STT and TTS

## Architecture

```text
React/Vite frontend
        |
        | Axios + JWT
        v
FastAPI backend
        |
        | Async SQLAlchemy
        v
PostgreSQL

FastAPI backend
        |
        | Live interview state, 1-hour TTL
        v
Redis

FastAPI backend
        |
        | Prompted interview and evaluation calls
        v
Google Gemini

FastAPI backend
        |
        | Voice transcription and generated speech
        v
Deepgram
```

## Backend Structure

```text
backend/app/
  api/          FastAPI route handlers
  config/       settings and database setup
  core/         prompts, AI interview flow, RAG context, Redis sessions, security
  models/       SQLAlchemy database models
  schemas/      Pydantic request/response schemas
  services/     business logic
  utils/        file upload helpers
```

Important files:

- `backend/app/main.py`: FastAPI app setup, CORS, static uploads, router registration.
- `backend/app/models/db_models.py`: Database models for users, jobs, resumes, applications, interviews, transcripts, evaluations, and scheduled interviews.
- `backend/app/services/ats_service.py`: Deterministic ATS scoring and ranking formula.
- `backend/app/core/rag_builder.py`: Vectorless RAG context assembly.
- `backend/app/core/interview_graph.py`: Gemini-powered adaptive interview logic.
- `backend/app/core/prompt_templates.py`: Centralized prompt templates.
- `backend/app/services/evaluation_service.py`: Multi-agent evaluation and consensus synthesis.
- `backend/app/core/session_manager.py`: Redis-backed live interview sessions.

## Frontend Structure

```text
frontend/my-app/src/
  api/          Axios API wrappers
  components/   layout and reusable UI components
  hooks/        frontend interaction hooks
  pages/        shared, recruiter, and candidate pages
  store/        Zustand auth/interview stores
```

Important files:

- `frontend/my-app/src/App.jsx`: Application routes and role-based navigation.
- `frontend/my-app/src/api/axios.js`: Axios client with JWT injection and 401 handling.
- `frontend/my-app/src/store/authStore.js`: Auth state persisted in localStorage.
- `frontend/my-app/src/pages/candidate/InterviewRoom.jsx`: Text and voice interview UI.
- `frontend/my-app/src/components/layout/ProtectedRoute.jsx`: Frontend route guard.

## ATS Scoring

ATS scoring is deterministic and explainable. It does not call Gemini.

```text
ranking_score =
  skills_score * 0.50
+ keyword_score * 0.30
+ experience_score * 0.20
```

The scorer returns:

- `ats_score`
- `ranking_score`
- `matched_skills`
- `skill_gaps`
- `experience_match`
- `recommendation`
- score breakdown

Candidates are ranked per job by `ranking_score DESC`.

## RAG and Embeddings

The current implementation uses vectorless RAG. Instead of creating embeddings or querying a vector database, the backend builds a structured context object from the candidate resume, job description, ATS score, matched skills, skill gaps, difficulty level, and interview history.

Embeddings are not currently used. A future version could add `pgvector`, Pinecone, Chroma, Weaviate, or another vector store for semantic candidate search, large resume retrieval, or cross-job matching.

## AI Interview Flow

1. Recruiter or candidate starts an interview with a resume and job.
2. Backend verifies that ATS scoring has already been run.
3. Backend creates an `Interview` record.
4. Live interview state is stored in Redis with a 1-hour TTL.
5. Gemini generates the first question.
6. Candidate submits text or voice answers.
7. Gemini analyzes each answer and chooses a route:
   - `follow_up`
   - `gap_probe`
   - `challenge`
   - `escalate`
   - `next_topic`
   - `complete`
8. Gemini generates the next question until max questions or completion.
9. Transcript turns are persisted in PostgreSQL.

## Evaluation Flow

After the interview is complete, the evaluation service runs a multi-agent workflow:

1. **Technical Agent**: Scores technical accuracy and depth.
2. **Communication Agent**: Scores clarity, structure, and confidence.
3. **HR/Integrity Agent**: Checks consistency with resume claims and identifies red flags.
4. **Consensus Builder**: Synthesizes the reports into one final evaluation.

Overall score:

```text
overall_score =
  technical_score * 0.35
+ communication_score * 0.20
+ consistency_score * 0.20
+ depth_score * 0.15
+ confidence_score * 0.10
```

Final recommendations are:

- `strong_yes`
- `yes`
- `maybe`
- `no`
- `strong_no`

## Security

Implemented:

- JWT bearer authentication.
- Bcrypt password hashing.
- Role metadata for `candidate`, `recruiter`, and `hr`.
- Backend role guard helper for protected actions.
- Frontend route guards.
- CORS allowlist through `ALLOWED_ORIGINS`.
- PDF-only resume uploads.
- Resume and avatar file size limits.
- Environment-based API keys and configuration.

Production hardening recommended:

- Replace the default `SECRET_KEY`.
- Use HTTPS everywhere.
- Consider HttpOnly cookies instead of localStorage for JWTs.
- Add backend ownership checks consistently across recruiter/HR routes.
- Add API rate limiting.
- Add malware scanning for uploaded files.
- Move uploaded files to S3/GCS with signed URLs.
- Add prompt-injection safeguards for resume and transcript text.
- Add audit logs for recruiter and HR actions.

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.10+
- Docker and Docker Compose
- Google Gemini API key
- Deepgram API key, optional for voice mode

### Start PostgreSQL and Redis

From the project root:

```bash
docker compose up -d
```

The compose file starts:

- PostgreSQL on host port `5433`
- Redis on host port `6379`

### Backend Setup

```bash
cd backend
python -m venv myenv
source myenv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://hireflow_user:hireflow_password@localhost:5433/hireflow_db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=replace_with_a_long_random_secret
ALLOWED_ORIGINS=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
```

Start the API:

```bash
uvicorn app.main:app --reload
```

Backend docs are available at:

```text
http://localhost:8000/docs
```

### Frontend Setup

```bash
cd frontend/my-app
npm install
npm run dev
```

The frontend runs at:

```text
http://localhost:5173
```

Optional frontend environment:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## Deployment Notes

Recommended production setup:

- Build and deploy the React app as static assets.
- Run FastAPI with Uvicorn/Gunicorn workers behind HTTPS.
- Use managed PostgreSQL.
- Use managed Redis.
- Store secrets in the deployment platform secret manager.
- Replace local disk uploads with object storage.
- Use Alembic migrations instead of relying on startup `create_all`.
- Add background workers for resume parsing, evaluation generation, notifications, and analytics refreshes.
- Add observability for logs, traces, model latency, and token usage.

## Current Implementation Notes

- The backend currently creates tables on startup using SQLAlchemy metadata.
- Docker Compose currently runs only PostgreSQL and Redis.
- The ATS scorer is deterministic Python, not LLM-based.
- The interview and evaluation systems use Gemini.
- The project uses vectorless RAG and does not currently generate embeddings.
- Voice mode depends on `DEEPGRAM_API_KEY`.
