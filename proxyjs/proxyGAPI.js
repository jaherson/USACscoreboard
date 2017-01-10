"use strict";

var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var sheets = google.sheets('v4');
var oauth2Client;
var nn=0;

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/sheets.googleapis.com-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'sheets.googleapis.com-nodejs-quickstart.json';

var DEVELOPER_KEY = 'AIzaSyAKwmt3P1M8Kj3VcTuwu4hw8i_wZmxK4_Q'; // The Browser API key obtained from the Google Developers Console.
var CLIENT_ID = '922926857166-j8ot1aebe96erhoj836kjhdl493l51up.apps.googleusercontent.com'; // Your Client ID can be retrieved from your project in the Google Developer Console, https://console.developers.google.com


// Load client secrets from a local file.
function getAuth() 
{
	fs.readFile('client_secret.json', function processClientSecrets(err, content) {
	  if (err) {
	    console.log('Error loading client secret file: ' + err);
	    return;
	  }

	  // Authorize a client with the loaded credentials, then call the
	  // Google Sheets API.
	  authorize(JSON.parse(content));
	  console.log("auth done!");
	});
}
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client);
    } else {
      oauth2Client.credentials = JSON.parse(token);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

function clock(start) {
    if ( !start ) return process.hrtime();
    var end = process.hrtime(start);
    return Math.round((end[0]*1000) + (end[1]/1000000));
}
/**
 * Print the names and majors of students in a sample spreadsheet:
 * https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 */

function querySheets()
{
    var t0 = clock();

    console.log("req %d", nn);

    // each query =~400ms
    sheets.spreadsheets.values.get({
	auth: oauth2Client,
	//    spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
	//    range: 'Class Data!A2:E',
	spreadsheetId: '1JV_y9P5UkX0jatGNpYJHQGS5Qh86NFM1LC1xddfNzbs',
	range: 'MJR!A6:K',
    }, function(err, response) {
	if (err) {
	    console.log('The API returned an error: ' + err);
	    return;
	}
	var rows = response.values;
	if (rows.length == 0) {
	    console.log('No data found.');
	} else {
	    var t1 = clock(t0);
	    console.log('res %d: Name, Major %d:', nn++, t1);
	    for (var i = 0; i < 2; i++) {//rows.length; i++) {
		var row = rows[i];
		// Print columns A and E, which correspond to indices 0 and 4.
		console.log('%s, %s, %s, %s, %s', row[0], row[1], row[2], row[3], row[4]);
	    }
	}
    });
}

module.exports = {
    Init:  function() 
    {
	console.log("GAPI::Init");
	getAuth();
    },
    Query: function () 
    {
	console.log("GAPI::Query");
	querySheets();
    }
};


