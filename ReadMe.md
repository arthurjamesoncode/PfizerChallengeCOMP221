# Pfizer Challenge Team AAAAND

Our idea is to create a guided testing app which automatically uploads tests to a server and sorts them in real time.

The project plan was previously here, but I moved it to a separate markdown file. This file is now just for installation instructions and details of use. After completing the front end, please write a similar guide for how to install it on your machine. This is for the team members making the video/anyone else who wants to run it themselves.

## DISCLAIMER

UNFINISHED INSTRUCTIONS - I am still writing them.

If you have an existing PfizerChallengeCOMP221 database then you need to run the UPGRADE_DB.sql file to fix
prievous errors with the backend that has now been fixed.

If you have not created the database yet then you can just run the initialise_database.sql file which is
correct.

Also for those testing the application, make sure your root MYSQL password is the same as the one in the .env file
you need for the backend to run

## Server
The server functions as a REST API. After the server is setup and run you can access it on the url displayed in the console. It should look something like below.

If not familiar with REST API's you use javaScripts fetch API to send a request to a url and it will respond with the data. Just read up on fetch and you should get it enough to use it.

```
Watching for file changes with StatReloader
Performing system checks...

System check identified no issues (0 silenced).
October 29, 2026 - 14:29:03
Django version 5.2.18, using settings 'config.settings'
Starting development server at http://127.0.0.1:8000/
Quit the server with CTRL-BREAK.
```

There are 4 api endpoints:
- `/api/test_scripts`
- `/api/tests`
- `/api/testers`
- `/api/bug_reports`

Each one has different behaviour for different HTTP Methods
| Endpoint | HTTP Method | Description |
| :--- | :--- | :--- |
| `/api/{object}/` | `GET` | Retrieve a list of all items |
| `/api/{object}/` | `POST` | Create a new item |
| `/api/{object}/{id}/` | `GET` | Retrieve a specific item by ID |
| `/api/{object}/{id}/` | `PUT` | Update a specific item by ID |
| `/api/{object}/{id}/` | `DELETE` | Delete a specific item by ID |

You should replace `{object}` with the object type and `{id}` with the objects id. 

For example using `GET` with 
```
/api/test_scripts/1
```
would return the test script with an id of 1.

You can also use filters to get specific items with fields other than id.

For example:
```
/api/test_scripts/?assigned=1
```
gives you all the test scripts assigned to the user with an id of 1.

When using `POST` and `PUT` to create or update, you should ensure the following:
- `Content-Type: application/json` is in the headers
- The body is a json object containing the data for the object

For example:
```
{
  test: 1,
  report_text: "Blah Blah Blah",
  submitted_by: 4
}
```

Note that you don't need to pass in read only fields such as `id`, these should be passed in using the url or, in the case of `POST`, will be automatically created.

That should be enough for the front end to work, but if there is anything else you need please ask me. It shouldn't be too hard to add.

### Setup
#### Database
To set up the database you need to:
- Install MySQL
- Start a database server on your local machine (make note of your root username and password)
- Open the instance of the database server with MySQL workbench
- Open the initialise_database.sql file in MySQL workbench and run it

You should now have a database with the correct schema running on your local machine.

You can also run the mock_data.sql file to generate some simple test data.

### Environment
Ensure you have python installed with 
```
python --version
```

I am using version 3.11.9, it should work with slightly different versions but if you are having problems change to this version as part of trouble shooting.

Make sure the repo is cloned on your local machine, and open a terminal inside of the server folder. Make sure it is in the server folder and not the root folder of the project.

Run
```
python -m venv venv
```
to generate a virtual environment folder. You then need to activate the virtual environment.

On windows Command Prompt run
```
venv\Scripts\activate
```

On mac, linux, or windows git bash run
```
source venv/Scripts/activate
```

Once done you should see `(venv)` written above your prompt in the command line. If not, something has gone wrong.

After this, you need to install the requirements with 
```
pip install -r requirements.txt 
```

You also need to add environment variables as a `.env` file in the `server` folder. It should look like this, but double check that the port and database user is right.
```
DEBUG=True
SECRET_KEY=your_secret_key
DB_NAME=PfizerChallengeCOMP221
DB_USER=root
DB_PASSWORD=your_password_here
DB_HOST=localhost
DB_PORT=3306
```

The secret key doesn't matter, since this is never going up publicly. I'm posting the one I used in teams, or you can generate your own at [this website](https://djecrety.ir/). I could just include it here but that feels wrong, since secrets should never be in version control.

Now everything should be set up to run. You can run the server with
```
python manage.py runserver
```

