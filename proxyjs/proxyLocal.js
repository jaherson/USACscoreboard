"use strict";
// serve up local /scoreboard/ files, don't forward to server
var fs = require('fs');
var path = require("path");
var url = require('url');

module.exports = {
    Get : function(dir, req, res)
{
    var mimeTypes = {
	"html": "text/html",
	"jpeg": "image/jpeg",
	"jpg": "image/jpeg",
	"png": "image/png",
	"js": "text/javascript",
	"css": "text/css"
    };

    var uri = url.parse(req.url).pathname;
    var filename = path.join(dir, unescape(uri));
    var stats;

    console.log("local: %s", filename);
    
    try {
	stats = fs.lstatSync(filename); // throws if path doesn't exist
    } catch (e) {
	console.log("%s not found\n", filename);
	res.writeHead(404,
	{
	    'Content-Type': 'text/plain'
	});
	res.write('404 Not Found\n');
	res.end();
	return;
    }

    if (stats.isFile()) {
	// path exists, is a file
	var mimeType = mimeTypes[path.extname(filename).split(".")[1]];
	res.writeHead(200,
	{
	    'Content-Type': mimeType
	});
	
	var fileStream = fs.createReadStream(filename).pipe(res);
    }
    else {
	res.writeHead(404,
	{
	    'Content-Type': 'text/plain'
	});
	res.write('404 Not Found\n');
	res.end();
	return;
    }
}
};


