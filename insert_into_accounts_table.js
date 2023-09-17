const mysql = require("mysql");
const bcrypt = require('bcrypt');
const fs = require("fs");

// Read the database login information from dbLogin.json
const dbLogin = JSON.parse(fs.readFileSync("dbLogin.json"));

const dbCon = mysql.createConnection({
    host: dbLogin.host,
    user: dbLogin.user,
    password: dbLogin.password,
    database: dbLogin.database,
    port: dbLogin.port
});


console.log("Attempting database connection");
dbCon.connect(function (err) {
    if (err) {
        throw err;
    }

    console.log("Connected to database!");

    const saltRounds = 10;
    const myPlaintextPassword = 'tango'; // replace with plaintext password chosen by you OR retain the same value
    const passwordHash = bcrypt.hashSync(myPlaintextPassword, saltRounds);

    const rowToBeInserted = {
        acc_name: 'charlie',            // replace with acc_name chosen by you OR retain the same value
        acc_login: 'charlie',           // replace with acc_login chosen by you OR retain the same value
        acc_password: passwordHash      
    };

    console.log("Attempting to insert record into tbl_accounts");
    dbCon.query('INSERT tbl_accounts SET ?', rowToBeInserted, function (err, result) {
        if (err) {
            throw err;
        }
        console.log("Table record inserted!");
    });

    dbCon.end();
});
