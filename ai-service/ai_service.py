"""
AI report checker for the Guided Testing app.

This service receives a tester's failure report and asks Google's Gemini AI
whether a developer could act on it. If the report is too vague, it returns
specific questions the tester can answer. It also checks earlier reports for
the same task to spot duplicates.
"""

import json
import os
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer


# read the settings from the .env file
def load_env(path):
    if os.path.exists(path):
        for line in open(path):
            if "=" in line and not line.startswith("#"):
                key, value = line.strip().split("=", 1)
                os.environ[key] = value


load_env(os.path.join(os.path.dirname(__file__), ".env"))

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite")
DJANGO_API = os.environ.get("DJANGO_API", "http://127.0.0.1:8000/api")
PORT = int(os.environ.get("AI_PORT", "8001"))

# same labels the frontend uses in assessment.js
LABELS = {
    "thin-evidence": "Evidence is thin",
    "not-actionable": "Bug is not actionable",
    "missing-context": "Missing context",
    "duplicate": "Duplicate report",
}

PROMPT = """You check bug reports written by software testers.
Decide if a developer could fix the bug using this report.

A report is not useful if:
- thin-evidence: there isn't enough information (like "it broke")
- not-actionable: it doesn't say what the tester did and what happened
- missing-context: you can't tell where the problem happens
- duplicate: one of the earlier reports describes the same problem

A short report can still be useful, for example "Clicking Save shows a blank white screen".

For each problem, write the detail as a friendly question that would help the tester
add what's missing, for example "After you clicked Log in, what did the screen show?"

Task: {description}
Expected result: {expected}
Tester's report: "{note}"
Earlier reports on this task: {earlier}

Answer only with JSON like this:
{{"useful": true or false, "score": 0 to 100, "summary": "one sentence",
  "issues": [{{"code": "thin-evidence", "detail": "question"}}],
  "duplicate_of": id of the earlier report or 0}}
"""


# get earlier bug reports for this task from the django server
# if django isn't running we just skip the duplicate check
def get_earlier_reports(task_id):
    try:
        url = DJANGO_API + "/bug_reports/?test=" + str(int(task_id))
        response = urllib.request.urlopen(url, timeout=3)
        rows = json.loads(response.read())
    except Exception:
        return []

    reports = []
    for row in rows:
        text = row.get("report_text") or ""
        text = text.replace("[CRITICAL] ", "")
        reports.append({"id": row["id"], "text": text})
    return reports


# send the prompt to gemini and get the json answer back
def ask_gemini(prompt):
    url = "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"},
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY},
    )
    response = urllib.request.urlopen(request, timeout=10)
    reply = json.loads(response.read())
    text = reply["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(text)


def assess(note, task, threshold=60):
    earlier = []
    if task.get("id") is not None:
        earlier = get_earlier_reports(task["id"])

    prompt = PROMPT.format(
        description=task.get("description", ""),
        expected=task.get("expected", ""),
        note=note,
        earlier=json.dumps(earlier) if earlier else "none",
    )
    answer = ask_gemini(prompt)

    # only keep the issues we know about
    issues = []
    for issue in answer.get("issues", []):
        code = issue.get("code")
        if code in LABELS and code != "duplicate":
            issues.append({"code": code, "label": LABELS[code], "detail": issue.get("detail", "")})

    # check the duplicate is a report that really exists
    duplicate = None
    for report in earlier:
        if str(report["id"]) == str(answer.get("duplicate_of")):
            duplicate = report

    if duplicate:
        issues.insert(0, {
            "code": "duplicate",
            "label": "Possible duplicate of report #" + str(duplicate["id"]),
            "detail": 'An earlier report says: "' + duplicate["text"][:150] + '". '
                      "If yours is different, say how. If it's the same, you can still submit it.",
        })

    # if there are any issues the report isn't useful
    useful = answer.get("useful") == True and len(issues) == 0

    # make the score match the frontend's 60 point limit
    score = int(answer.get("score", 0))
    if useful:
        score = max(score, threshold)
    else:
        score = min(score, threshold - 1)

    return {
        "useful": useful,
        "score": score,
        "verdict": "useful" if useful else "needs-detail",
        "issues": issues,
        "signals": [answer.get("summary", "")],
        "summary": answer.get("summary", ""),
        "duplicate_of": duplicate["id"] if duplicate else None,
        "source": "ai",
    }


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        # let the frontend on port 5173 call this server
        origin = self.headers.get("Origin")
        if origin in ["http://127.0.0.1:5173", "http://localhost:5173"]:
            self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self):
        self.send_json(200, {})

    def do_GET(self):
        self.send_json(200, {"ok": True, "model": GEMINI_MODEL, "has_key": GEMINI_API_KEY != ""})

    def do_POST(self):
        if self.path != "/assess":
            self.send_json(404, {"error": "Use POST /assess"})
            return

        length = int(self.headers.get("Content-Length", 0))
        data = json.loads(self.rfile.read(length))
        note = data.get("note", "").strip()

        if note == "":
            self.send_json(400, {"error": "note is empty"})
            return
        if GEMINI_API_KEY == "":
            self.send_json(503, {"error": "No GEMINI_API_KEY in .env"})
            return

        try:
            result = assess(note, data.get("task", {}), data.get("threshold", 60))
            self.send_json(200, result)
        except Exception as error:
            # if anything goes wrong the frontend uses the basic check instead
            print("AI check failed:", error)
            self.send_json(503, {"error": "AI unavailable"})


if __name__ == "__main__":
    print("AI service running at http://127.0.0.1:" + str(PORT) + "/")
    if GEMINI_API_KEY == "":
        print("WARNING: no GEMINI_API_KEY in .env - the app will use the basic check instead.")
    HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
