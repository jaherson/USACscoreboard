"use strict";

var connect = require('connect');
var app = connect();

//load configuration params
var config = require('./proxy.json');
var proxyHost = config['proxyHost'];
var remoteHost = config['remoteHost'];

//proxy server for local /scoreboard files
var proxyLocal = require('./proxyLocal');

//proxy server for www.usaclimbing.org
var proxyRemote = require('./proxyRemote');
proxyRemote.Init(app, config);

//proxy server for google sheets
var proxyGAPI = require('./proxyGAPI');        
proxyGAPI.Init();

app.use(
  function (req, res) {
    if (req.url.indexOf('/scoreboard/') == 0) {
	proxyLocal.Get('.', req, res);
    } else if (req.url.indexOf('/gapi/') == 0) {
	proxyGAPI.Get(req, res);
    } else {
	proxyRemote.Get(req, res);
    }
})

app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Proxy error!');
})

process.on('uncaughtException', function(err) {
    if(err.errno === 'EADDRINUSE')
         console.log("error: EADDRINUS");
    else
         console.log(err);
    process.exit(1);
});     



