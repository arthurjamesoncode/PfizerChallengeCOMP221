## Feature List:

Essential for Guided testing app:
- Take Script in standardized format
- Present each step one by one
- Show expected output and give a button that says yes or no
- If yes is selected, do nothing, if no is selected offer a text box and submit button
- On submit send the text to a server database storing text, the user, test number
- On completion show summary.

### Flow of App
- On open, some prompt to select a specific tester
- On selection, shows all tests assigned to that tester
- Tester can select a specific test script
- Works through the test script one task at a time
- On each task it provides the description of the task, and the expected result along with a success or failure button,
- On success move on to next item in script
- On failure allow entry of information, and ask if it was critical failure. 
- AI assessment of if information entered is useful
- If yes, skip to end.
- If no, continue with the rest of the test cases.
- At the end show a summary of the test cases and responses.
- Return to home page.

Information is not useful if:
- Evidence is thin
- Bug is not actionable
- Already Known (Stretch Goal)
- Duplicate Report (Stretch Goal)

### Stretch Goals
- Show bug reports, with sorting by User and Test
- Real time duplicate flagging
- Marking responses as known bugs before submission

### Tests Scripts Format
This should be an list:
- Tests
- User assigned to each test

Example Test Scripts Object
```json
{
  "Testers": ["Steve", "Bob", "Sarah"]
  "Tests": {
    "Assigned": "Steve"
    "Tasks": [
      {
        "Description": "Open App", 
        "Expected": "Should Open to Homepage"
      }
    ]
  }
}
```

### Division of Labour
- Arthur: Server & Database
- Ashwin & Ayush: Front End
- Anton: AI Integration
- Dawei: Script
- Nameer: Video
