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
function gapiAuth() 
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
var gdrive = google.drive('v3');

function clock(start) {
    if ( !start ) return process.hrtime();
    var end = process.hrtime(start);
    return Math.round((end[0]*1000) + (end[1]/1000000));
}

function respond404(res)
{
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.write('404 Not Found\n');
    res.end();
}

function respond200(res)
{
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end();
}

function respondJSON(res, json)
{
    res.writeHead(200, {'Content-Type': 'application/json' });
    res.write(json);
    res.end();
}

function gapiFileList(options, req, res)
{
    options.auth = oauth2Client;

    gdrive.files.list(options, function(err, response) {
	if (err) {
	    console.log('gapiFileList error: ' + err);
	    respond404(res);
	} else {
	    console.log('gapi.FileList: %d files:', response.files.length);
	    respondJSON(res, JSON.stringify(response));	    
	}
    });
}

function gapiFileCopy(options, req, res)
{
    options.auth = oauth2Client;

    gdrive.files.copy(options, function(err, response) {
	if (err) {
	    console.log('gapiFileCopy: ' + err);
	    respond404(res);
	} else {
	    respondJSON(res, JSON.stringify(response));	    
	}
    });
}

function gapiFileDelete(options, req, res)
{
    options.auth = oauth2Client;
    gdrive.files.delete(options, function(err, response) {
	if (err) {
	    console.log('gapiFileDelete: ' + err);
	    respond404(res);
	} else {
	    respond200(res);
	}
    });
}

function gapiBatchGet(options, req, res)
{
    options.auth = oauth2Client;

    sheets.spreadsheets.values.batchGet(options, function(err, response) {
	if (err) {
	    console.log('GAPI error: ' + err);
	    return;
	}
	var ranges = response.valueRanges;
	if (ranges.length == 0) {
	    console.log('No data found.');
	    respond404(res);
	} else {
	    var json = JSON.stringify(response);
	    console.log('gapi.batchGet(%d):', json.length);
	    res.writeHead(200,
			  {
			      'Content-Type': 'application/json'
			  });
	    res.write(json);
	    res.end();
	}
    });
}

function gapiGet(req, res)
{
    console.log(req.url);
    var argv = req.url.split('?');
    var url = argv[0];
    var options = JSON.parse(decodeURIComponent(argv[1]));

    if (req.url.indexOf('/gapi/filesList') == 0) {
	gapiFileList(options, req, res);
    } else if (req.url.indexOf('/gapi/filesCopy') == 0) {
	gapiFileCopy(options, req, res);
    } else if (req.url.indexOf('/gapi/filesDelete') == 0) {
	gapiFileDelete(options, req, res);
    } else if (req.url.indexOf('/gapi/batchGet') == 0) {
	gapiBatchGet(options, req, res);
    } else {
	console.log("GAPI: invalid req %s", req.url);
    }
}

module.exports = {
    Init:  function() 
    {
	gapiAuth();
    },
    Get: function(req, res)
    {
	gapiGet(req, res);
    }
};
