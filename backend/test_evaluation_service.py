import unittest
import sys
import types
from types import SimpleNamespace

google_module = types.ModuleType("google")
google_module.genai = SimpleNamespace(Client=object)
sys.modules.setdefault("google", google_module)
sys.modules.setdefault("google.genai", google_module.genai)
sys.modules.setdefault(
    "app.config.settings",
    SimpleNamespace(settings=SimpleNamespace(GEMINI_API_KEY="test")),
)
sys.modules.setdefault(
    "app.models.db_models",
    SimpleNamespace(
        Interview=object,
        Transcript=object,
        Resume=object,
        Job=object,
    ),
)

from app.services.evaluation_service import _build_insufficient_progress_evaluation


class EvaluationServiceTests(unittest.TestCase):
    def test_no_candidate_answers_returns_insufficient_progress_evaluation(self):
        transcript = SimpleNamespace(
            turns=[
                {
                    "turn": 0,
                    "role": "interviewer",
                    "content": "Tell me about your experience.",
                    "question_type": "opening",
                }
            ]
        )
        resume = SimpleNamespace(skill_gaps=["Python", "System Design"])

        result = _build_insufficient_progress_evaluation(transcript, resume)

        self.assertIsNotNone(result)
        self.assertEqual(result["overall_score"], 0.0)
        self.assertEqual(result["hire_recommendation"], "strong_no")
        self.assertEqual(result["strengths"], [])
        self.assertIn("before the candidate answered", result["red_flags"][0])
        self.assertEqual(
            result["skill_gap_confirmed"],
            {"Python": "unclear", "System Design": "unclear"},
        )


if __name__ == "__main__":
    unittest.main()
