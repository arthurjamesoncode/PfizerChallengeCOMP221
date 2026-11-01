# AI Report Checker

This is my part of the project. When someone fails a task and writes a report, the report goes to this little server first and Gemini checks if it's actually useful. If it's too vague (like "it broke") it asks the tester a question to get more detail. They can still just submit it anyway if they want.

If you don't run this or don't have a key, the app still works, it just uses the basic check that was already in the frontend.

## Setup
You need python 3.9 or newer, there's nothing to pip install.

You need a Gemini API key, it's free. Get one from https://aistudio.google.com/apikey

Then in the ai-service folder copy `.env.example`, rename it to `.env` and paste your key after `GEMINI_API_KEY=`

The .env file is gitignored so you have to make your own.

## Running it
Open a terminal in the ai-service folder and run
```
python ai_service.py
```
(I had to use `python3` on mac)

It should say
```
AI service running at http://127.0.0.1:8001/
```
Keep it open and run the frontend in another terminal like normal.

To test it, fail a task and just write `it broke`. If the yellow box says "Checked by AI" at the bottom then it's working.

## If it doesn't work
- `no GEMINI_API_KEY in .env` - your .env file is missing or named wrong. On windows check notepad didn't save it as .env.txt
- `HTTP Error 400` or `403` - the key is wrong, copy it again
- `HTTP Error 429` - you've used up the free daily limit, try again later
