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
var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
var TOKEN_PATH = './token.json';

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
	console.log("gapi authorized");
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
    /*
    try {
	fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
	if (err.code != 'EEXIST') {
	    throw err;
	}
    }
    */
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
}

/* application code */

function clock(start) {
    if ( !start ) return process.hrtime();
    var end = process.hrtime(start);
    return Math.round((end[0]*1000) + (end[1]/1000000));
}

function proxyGAPIGet(req, res)
{
    var t0 = clock();
    var argv = req.url.split('?');
    var url = argv[0];
    var options = JSON.parse(decodeURIComponent(argv[1]));
    options.auth = oauth2Client;

    sheets.spreadsheets.values.batchGet(options, function(err, response) {
	if (err) {
	    console.log('GAPI error: ' + err);
	    return;
	}
	var t1 = clock(t0);
	var ranges = response.valueRanges;
	if (ranges.length == 0) {
	    console.log('No data found.');
	} else {
	    console.log('gapi.batchGet(%s) in %dms:', options, t1);
	    res.writeHead(200,
			  {
			      'Content-Type': 'application/json'
			  });
	    res.write(JSON.stringify(response));
	    res.end();
	}
    });
}

module.exports = {
    Init:  function() 
    {
	getAuth();
    },
    Get: function(req, res)
    {
	proxyGAPIGet(req, res);
    }
};


