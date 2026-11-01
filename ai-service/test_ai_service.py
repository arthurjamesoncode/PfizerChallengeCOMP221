"""
Tests for the AI report checker.

These tests replace the Gemini and Django calls with fake answers, so they
run without an API key or an internet connection.
"""

import unittest

import ai_service

TASK = {"id": 2, "description": "Enter invalid password and click login",
        "expected": "Error message displays invalid credentials"}


def use_fake_answers(gemini_answer, earlier_reports=[]):
    ai_service.ask_gemini = lambda prompt: gemini_answer
    ai_service.get_earlier_reports = lambda task_id: earlier_reports


class TestAIService(unittest.TestCase):

    def test_good_report_is_useful(self):
        use_fake_answers({"useful": True, "score": 85, "summary": "Clear.",
                          "issues": [], "duplicate_of": 0})
        result = ai_service.assess("The error says 'oops' instead of invalid credentials", TASK)
        self.assertTrue(result["useful"])

    def test_vague_report_is_not_useful(self):
        use_fake_answers({"useful": False, "score": 10, "summary": "Too vague.", "duplicate_of": 0,
                          "issues": [{"code": "thin-evidence", "detail": "What did the screen show?"}]})
        result = ai_service.assess("it broke", TASK)
        self.assertFalse(result["useful"])
        self.assertEqual(result["issues"][0]["label"], "Evidence is thin")

    def test_duplicate_is_flagged(self):
        earlier = [{"id": 7, "text": "Error says 'Something went wrong'"}]
        use_fake_answers({"useful": True, "score": 80, "summary": "",
                          "issues": [], "duplicate_of": 7}, earlier)
        result = ai_service.assess("It says something went wrong", TASK)
        self.assertEqual(result["duplicate_of"], 7)

    def test_ai_cannot_make_up_a_duplicate(self):
        use_fake_answers({"useful": True, "score": 80, "summary": "",
                          "issues": [], "duplicate_of": 99})  # report 99 doesn't exist
        result = ai_service.assess("It says something went wrong", TASK)
        self.assertIsNone(result["duplicate_of"])


if __name__ == "__main__":
    unittest.main()
