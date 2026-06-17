# HireFlow-AI 🚀

HireFlow-AI is an Enterprise AI Recruitment platform designed to streamline the hiring process using advanced AI. It provides an end-to-end solution for modern recruiters and candidates, featuring an automated Applicant Tracking System (ATS), interactive AI-driven interviews, and comprehensive candidate evaluation.

## ✨ Features

- **Dual-Role Architecture**: Dedicated flows for both Recruiters and Candidates.
- **AI ATS Scoring**: Automatically extract skills from resumes and score them against job descriptions using Google Gemini.
- **Interactive AI Interviews**: Candidates can conduct text or voice-based interviews with an AI recruiter. The AI adapts questions dynamically based on the candidate's resume and job requirements.
- **Voice Capabilities**: Integrated with Deepgram for ultra-low latency Speech-to-Text and Text-to-Speech (optional).
- **Evaluation Engine**: Automatically generates comprehensive evaluation reports summarizing candidate performance after the interview.
- **Stark Editorial Design**: A clean, premium UI with 1px borders, bold typography, and smooth micro-animations.

## 🛠 Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Zustand, Lucide Icons, Recharts
- **Backend**: FastAPI, SQLAlchemy (Async), PostgreSQL/SQLite
- **AI Integration**: Google GenAI SDK (Gemini 1.5 Pro / Flash)
- **Audio**: Deepgram SDK

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- Gemini API Key

### Backend Setup
1. Navigate to the `backend` directory.
2. Create a virtual environment: `python -m venv myenv`
3. Activate the environment: `source myenv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Create a `.env` file based on `.env.example` and add your `GEMINI_API_KEY`.
6. Start the server: `uvicorn app.main:app --reload`

### Frontend Setup
1. Navigate to the `frontend/my-app` directory.
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

The application will be available at `http://localhost:5173`.

## 🤝 Contributing
Contributions are welcome! Please open an issue or submit a pull request.