"use strict";

var http = require('http');
var httpProxy = require('http-proxy');
var agent = new http.Agent({ maxSockets: 100 });

var remoteHost = 'www.usaclimbing.org';
var proxyHost = 'vocr.sri.com';
var proxyPort = 8000;
var images404 = 1;
var patchScript = '/scoreboard/scoreboard.js';

//modify /scoring-and-results page to include scoreboard.js
//adapted from https://github.com/No9/harmon
var selects = [];
var headselect = {};
headselect.query = 'head';
headselect.func = function (node) {
    var rs = node.createReadStream();
    var ws = node.createWriteStream({outer: false});

    console.log("patched: %s", patchScript);
    rs.pipe(ws, {end: false});
    rs.on('end', function(){
	var patch = '<script type="text/javascript" src="' + patchScript + '"></script>';
	ws.end(patch);
    });
} 
selects.push(headselect);

var proxy;
var harmon=require('harmon');

module.exports = {
    Init : function(app, config) {
	if (config['remoteHost'])
	    remoteHost = config['remoteHost'];
	if (config['proxyHost'])
	    proxyHost = config['proxyHost'];
	if (config['proxyPort'])
	    proxyPort = config['proxyPort'];
	if (config['images404'])
	    images404 = config['images404'];
	if (config['patchScript'])
	    patchScript = config['patchScript'];
	
	console.log(patchScript + remoteHost);

	proxy = httpProxy.createProxyServer(
	    {
		target: 'http://'+ remoteHost,
		agent: agent
	    });

	// Listen for the `error` event on `proxy`. 
	proxy.on('error', function (err, req, res) {
	    console.log("proxy error" + e);
	    res.writeHead(500, {
		'Content-Type': 'text/plain'
	    });
 
	    res.end('Something went wrong. And we are reporting a custom error message.');
	});
 

	proxy.on('end', function(req, res, response) {

	    var url = req.url;
	    var bytesIn = response.socket._bytesDispatched;
	    var bytesOut = response.socket.bytesRead;

	    console.log("%s req(%d) res(%d)", url, bytesIn, bytesOut);
	});

	
	app.use('/scoring-and-results/', harmon([], selects));

	http.createServer(app).listen(proxyPort);
	console.log("%s => %s\n", proxyHost, remoteHost);
    },

    Get : function(req, res) {
	var isImage =
	    req.url.indexOf('.jpg') != -1 ||
	    req.url.indexOf('.JPG') != -1 ||
	    req.url.indexOf('.jpeg') != -1 ||	
	    req.url.indexOf('.png') != -1 ||
	    req.url.indexOf('.gif') != -1;

	var isJunk =
	    req.url.indexOf('/Assets/') != -1 ||
	    req.url.indexOf('/scripts/') != -1 ||
            req.url.indexOf('/SharedSites/') != -1 ||
            req.url.indexOf('/system/') != -1 ||
	    req.url.indexOf('/cm/webui/') != -1;

	if (isImage && images404) {
            res.writeHead(404);
            res.end();
	    return;
	}

	req.headers['host'] = remoteHost;
	if (req.headers['referer']) {
	    req.headers['referer'] = req.headers['referer'].replace(proxyHost, remoteHost);    
	}

	proxy.web(req, res);
    }
};
