# **Schedule Builder Website**
<hr>
Thomas Knickerbocker \

![Alt text](client/images/scheduleExample.png?raw=true "My Schedule Page")


## Description:
This is a simple full-stack web app utilizing node, express, pug (a more concise HTML alternative), and a database. 
The application has three main components: 

1. Login and Signout Functionality: User authentication is implemented using bcrypt hashes for password protection.
2. Schedule Management: Users can create, update, view, delete, detect scheduling conflicts, and upload JSON files containing their schedules. Schedule data is stored in a database.
3. Stock Page: The application pulls real-time stock data from AlphaVantage's API and displays it.

Database configuration files are included in this repository and can be executed via the command line.


## To Use:
### 1. Clone the repository
### 2. Run $\) npm install to download dependencies
### 3. Create a file named "dbLogin.json" with your database information following this structure:
{
    "host": "xxx",
    "user": "xxx",
    "password": "xxx",
    "database": "xxx",
    "port": 3306,
    "secret":"xxx"
}
Where "xxx" is replaced by your actual database information

### 4. Create a file named "myAPIKeys.json" with the following structure:
{
    "apiKey": "your-api-key"
}
Where the value your-api-key is an alphavantage api key (which is used for real-time stock data querying), and can be made for free [here](https://www.alphavantage.co/support/#api-key)

### 5. Run the following commands in the command-line to initialize the database tables and a basic username-password pair:
node create_accounts_table.js
node create_events_table.js
node insert_into_accounts_table.js
#### **NOTE:** After running the script insert_accounts, a valid username & password pair will be:
username: charlie
password: tango
### 6. Run the app via:
node index.js
