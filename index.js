// include express module
var express = require("express");

// create express app
var app = express();
const url = require('url');
// helps in extracting the body portion of an incoming request stream
var bodyparser = require('body-parser');
// fs module - provides an API for interacting with the file system
var fs = require("fs");
// helps in managing user sessions
var session = require('express-session');
// include the mysql module
var mysql = require("mysql");
// helpful for reading, compiling, rendering pug templates
const pug = require("pug");  
// Bcrypt library for comparing password hashes
const bcrypt = require('bcrypt');
const axios = require('axios');  // used for API calls
const multer = require('multer'); // For file uploads
const upload = multer({ dest: 'uploads/' });

// Configure the 'uploads' folder if it doesn't exist
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// Setup pug
app.set('view engine', 'pug');
app.set('views', './client/views');
const stocksAPIKey = require('./myAPIKeys.json').apiKey;
const dbLogin = JSON.parse(fs.readFileSync("dbLogin.json"));

// apply the body-parser middleware to all incoming requests
app.use(bodyparser());

// use express-session
app.use(session({
  secret: dbLogin.secret,
  saveUninitialized: true,
  resave: false
}
));

// server listens on port 9015 for incoming connections
app.listen(9015, () => console.log('Listening on port 9015!'));
const connection = mysql.createConnection({
  host: dbLogin.host,
  user: dbLogin.user,
  password: dbLogin.password,
  database: dbLogin.database,
  port: dbLogin.port
});
connection.connect();

// function to return the welcome page
app.get('/',function(req, res) {
  if (req.session.user){
    res.render('home');
  }
  else{
    res.render('login');
  }
});
app.get('/addEvent',function(req, res) {
  res.render('addEvent');
});
app.get('/schedule',function(req, res) {
  res.render('schedule');
});
app.get('/uploadSchedule',function(req, res) {
  res.render('uploadSchedule');
});
app.get('/updateEvent',function(req, res) {
  res.render('updateEvent', { record: req.record });
});

app.get('/stocks', async (req, res) => {
  if (req.session.user) {
    try {
      const apiKey = stocksAPIKey; 

      // Get GOOGL stock data
      const googlResponse = await axios.get(
        `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=GOOGL&interval=1min&apikey=${apiKey}`
      );

      // Get stock data from response
      const googlStockData = googlResponse.data['Time Series (1min)'];
      const googlLatestTimestamp = Object.keys(googlStockData)[0];
      const googlLatestPrice = googlStockData[googlLatestTimestamp]['1. open'];
      const googlChange =
        googlStockData[googlLatestTimestamp]['4. close'] -
        googlStockData[googlLatestTimestamp]['1. open'];
      
      // Create an object with the fetched GOOGL stock data
      const googlStockRecord = {
        symbol: 'GOOGL',
        companyName: 'Alphabet Inc.',
        lastPrice: googlLatestPrice,
        change: googlChange.toFixed(2),
      };
      
      // Get AAPL stock data
      const aaplResponse = await axios.get(
        `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=AAPL&interval=1min&apikey=${apiKey}`
      );
      // console.log("Apple:")
      // console.log(aaplResponse.data['Meta Data']);
      
      // Extract relevant AAPL stock data from the API response
      const aaplStockData = aaplResponse.data['Time Series (1min)'];
      const aaplLatestTimestamp = Object.keys(aaplStockData)[0];
      const aaplLatestPrice = aaplStockData[aaplLatestTimestamp]['1. open'];
      const aaplChange =
        aaplStockData[aaplLatestTimestamp]['4. close'] -
        aaplStockData[aaplLatestTimestamp]['1. open'];
      
      // Create an object with the fetched AAPL stock data
      const aaplStockRecord = {
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
        lastPrice: aaplLatestPrice,
        change: aaplChange.toFixed(2),
      };
      res.render('stocks', { stocks : [aaplStockRecord, googlStockRecord]});
    } catch (error) {
      console.error('Error fetching stock data:', error);
      res.locals.stocks = [];  // Set an empty array if there's an error
      res.render('stocks', { stocks: null });  // Render with null data in case of an error
    }
  } else {
    res.render('login');
  }
});

app.get('/login',function(req, res) {
	res.render('login');
});
// Verify that user is logged in, else send unauthorized status & client-side code will redirect 
// (because my redirect does not work, I had to do this. Made a piazza post about it. Only works for /schedule, not sure why)
app.get('/checkLogin', function(req, res) {
  console.log("checking login status");
  if (req.session.user) {  // user is logged in
    res.sendStatus(200); 
  } else {
    res.sendStatus(401);
  }
});
app.get('/getSchedule', function (req, res) {
  const day = req.query.day;
  // get all events on day, sorted by start time
  connection.query('SELECT * FROM tbl_events WHERE event_day = ? ORDER BY event_start', day, function (error, results, fields) { 
    if (error) throw error;
    res.send(results);
  });
});
app.get('/getInterferences', (req, res) => {
  checkInterferences(req, res, req.query, true);
});
app.get('/logout', function(req, res) {
  console.log("attempting to logout");
  if (req.session.user) {
    req.session.destroy((err) => {
      if (err) {
        throw err;
      } else {
        console.log("Successfully Destroyed Session! (logged out)");
        res.redirect('/login'); // neither of the variations work
      }
    });
  } else {
    console.log("Not logged in: req.session.value not set!");
    res.redirect(302, '/login');
  }
});

app.post('/postEventEntry', (req, res) => {
  const { event, day, start, end, phone, location, info, url } = req.body;
  queryParams = [day, event, start, end, location, phone, info, url];
  connection.query(`INSERT INTO tbl_events (event_day, event_event, event_start, event_end, event_location, event_phone, event_info, event_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, queryParams, function (error, results, fields) {
    if (error) throw error;
    res.redirect('/schedule');
  });
});
app.post('/sendLoginDetails',function(req, res) {
  const {username, password} = req.body;
  connection.query(`SELECT * FROM tbl_accounts WHERE acc_login='${username}'`, function (error, results, fields) {
    if (error) throw error;
    if (results.length === 0) {
      console.log("Incorrect username");
      res.json({status:'fail'});
    } else {
      const hashedPassword = results[0].acc_password;
      if (bcrypt.compareSync(password, hashedPassword)){
        req.session.user = results[0].acc_name;
        req.session.value=1;
        res.json({status:'success'});
      }
      else {
          console.log("Incorrect password");
          res.json({status:'fail'});
      }
      };
  });
});

app.get('/edit/:id', function(req, res) {
  if (req.session.user) {
    const id = req.params.id;

    connection.query('SELECT * FROM tbl_events WHERE event_id = ?', [id], function(error, results, fields) {
      if (error) throw error;
      if (results.length == 0) {
        res.status(404).send('Event not found!');
      } else {
        const eventToEdit = {
          id: results[0].event_id,
          name: results[0].event_event,
          day: results[0].event_day,
          start: results[0].event_start,
          end: results[0].event_end,
          location: results[0].event_location,
          phone: results[0].event_phone,
          info: results[0].event_info,
          url: results[0].event_url
        };
        console.log("Redirecting to updateEvent");
        res.render('updateEvent', { record: eventToEdit, creating: false });
      }
    });
  } else {
    res.redirect(302, '/login');
  }
});

app.post('/updateEvent/:id', function(req, res) {
  const id = req.params.id;
  const event = req.body;

  if (req.session.user) {
    connection.query('UPDATE tbl_events SET event_event = ?, event_day = ?, event_start = ?, event_end = ?, event_location = ?, event_phone = ?, event_info = ?, event_url = ? WHERE event_id = ?', [event.event, event.day, event.start, event.end, event.location, event.phone, event.info, event.url, id], function(error, results, fields) {
      if (error) {
        console.log(error);
      } else {
        console.log('Row ' + id + ' updated!');
        res.redirect(302, '/schedule');
      }
    });
  } else {
    res.redirect(302, '/login');
  }
});


app.get('/deleteEvent/:id', (req, res) => {
  const eventId = req.params.id;
  connection.query('DELETE FROM tbl_events WHERE event_id = ?', [eventId], (err, results) => {
    if (err) {
      console.error(err);
      return res.sendStatus(500);
    }
    if (results.affectedRows === 0) {
      console.log("Could not find event w/ id " + eventId);
      return res.sendStatus(404);
    }
    console.log("Deleted event w/ id " + eventId);
    res.sendStatus(200);
  });
});

// Handle uploaded JSON files
app.post('/uploadJson', upload.single('jsonFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  // Read the uploaded JSON file
  fs.readFile(req.file.path, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error reading the uploaded file.');
    }
    try {
      const jsonData = JSON.parse(data); // Parse the JSON data
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      // Iterate through each day and its events
      days.forEach((day) => {
        const events = jsonData[day];
        console.log(events);
        if (events && Array.isArray(events)) {
          events.forEach((event) => {
            // Extract data from each event
            const { name, start, end, phone, location, info, url } = event;
            const queryParams = [day, name, start, end, location, phone, info, url];
            console.log(name);
            // Insert into DB using your database connection and query
            connection.query(
              `INSERT INTO tbl_events (event_day, event_event, event_start, event_end, event_location, event_phone, event_info, event_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              queryParams,
              function (error, results, fields) {
                if (error) throw error;
                console.log(`Inserted event: ${name} on ${day}`);
              }
            );
          });
        }
      });
      // Redirect the user to the '/schedule' page after processing
      res.redirect('/schedule');
    } catch (error) {
      const errorHtml = pug.renderFile('jsonError.pug');
      res.status(400).send(errorHtml);
    }
  });
});

// app.use(requireLogin);
// middle ware to serve static files
app.use('/client', express.static(__dirname + '/client'));
app.get('*', function(req, res) {
  res.sendStatus(404);
});

// Helper function to check if any events overlap with event to be inserted
function checkInterferences(req, res, q){ // res.json of overlapping events
  let day = q.day;
  let start = q.start;
  let end = q.end;
  console.log("Querying", day, start, end);
  connection.query(`SELECT * FROM tbl_events WHERE event_day='${day}' AND ((event_start <= '${end}' AND event_start >= '${start}') OR (event_end >= '${start}' AND event_end <= '${end}') OR (event_start <= '${start}' AND event_end >= '${end}'))`, function (error, results, fields) {
    if (error) throw error;
    console.log(results);
    res.json({results});
  });
}
