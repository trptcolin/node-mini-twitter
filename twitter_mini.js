var http = require('http');
var sys = require('sys');
var fs = require('fs');
require('underscore');

var encodeCreds = function(creds) {
  var base64_encode = require('base64').encode;
  var Buffer = require('buffer').Buffer;
  var buf = new Buffer(creds);
  return base64_encode(buf);
}

var mussedCreds = fs.readFileSync(".creds", "utf8");

var Twitter = {
  creds: mussedCreds.substring(0, mussedCreds.length - 1),

  protocol: 'http',
  apiHost: 'api.twitter.com',

  timelineUrl: "/1/statuses/friends_timeline.json",

  getTimeline: function(onComplete) {
    var client = http.createClient(80, this.apiHost);
    var headers = {'host': this.apiHost,
                   'Authorization': 'Basic ' + encodeCreds(this.creds)};
    var request = client.request('GET', this.timelineUrl, headers);
    request.end();

    var chunks = "";
    request.on('response', function (response) {
      var chunks = "";
      response.setEncoding('utf8');
      response.on('data', function (chunk) {
        chunks += chunk;
      });
      response.on('end', function () {
        onComplete(chunks);
      });
    });
  },

  linkForUser: function(screenName, text) {
    return "<a href='http://twitter.com/" + screenName + "'>" + text + "</a>";
  },

  htmlForTweet: function(tweet) {
    var user = tweet["user"];
    var screenName = user["screen_name"];
    var avatar = this.linkForUser(screenName, "<img src='" + user["profile_image_url"] + "' />");
    var htmlScreenName = "<h3>" + this.linkForUser(screenName, screenName) + "</h3>";
    var htmlText = "<p>" + tweet["text"] + "</p>";
    return "<div class='tweet'>" + avatar + htmlScreenName + htmlText + "</div>";
  }
}

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});

  var htmlFor = function(content) {
    var css = "* {padding: 0; margin: 0;}" +
              "html {background-color: #FAFAFA;}" +
              "h3 {display: inline;}" +
              "img {vertical-align: middle; padding-right: 10px;}" +
              ".content {width: 80%; margin: 0 auto;}" +
              ".tweet {padding: 5px; background: #FAFAFA; border-bottom: 1px solid #AAA;}";
    var html = "<html><head><title>Twitter Mini</title><style type='text/css'>" +
               css + '<meta content="text/html; charset=utf-8" http-equiv="Content-Type" />' +
               "</style></head><body><div class='content'><h1>Twitter Mini</h1>" + content + "</div></body></html>"

    return html;
  }


  Twitter.getTimeline(function(content) {
    var data = _.map(JSON.parse(content), function(tweet) {
      return Twitter.htmlForTweet(tweet);
    });
    res.end(htmlFor(data.join("")));
  });
}).listen(8124, "127.0.0.1");

console.log('Server running at http://127.0.0.1:8124/');

