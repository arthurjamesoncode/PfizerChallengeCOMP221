# AI Integration

Anton

## What it does
When a tester fails a task and writes a report, Gemini checks if the report is useful before it gets saved. If it's too vague the tester gets asked a question so they can add more detail. They can still submit it anyway.

In live mode it also looks at earlier reports for the same task to see if it's a duplicate.

## How it fits in
I tried not to change anyone else's work:
- `ai-service/ai_service.py` is a separate small server on port 8001 that talks to Gemini
- `src/ai/aiClient.js` sends the report from the frontend to that server
- `src/api.js` has 5 lines changed so it uses the AI check (they're marked with `// AI integration (Anton)`)
- the backend isn't changed at all, it just reads the old bug reports from `/api/bug_reports/`

The API key stays in `ai-service/.env` so it never ends up in the browser or on GitHub.

## If the AI isn't working
If the server isn't running, there's no key or the free limit runs out, the app just uses the basic check in `assessment.js` like before.

## Running it
See the README in the ai-service folder.
