var http = require('http');
var sys = require('sys');
var twitterMini = require('./twitter_mini');

http.createServer(twitterMini.serverResponder).listen(8124, "127.0.0.1");
console.log('Server running at http://127.0.0.1:8124/');
