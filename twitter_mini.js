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
  updateUrl: "/1/statuses/update.json",

  makeRequest: function(method, url, params, callback) {
    var client = http.createClient(80, this.apiHost);
    var headers = {'host': this.apiHost,
                   'Authorization': 'Basic ' + encodeCreds(this.creds)};
    var request = client.request(method, url, headers);
    request.write(params);
    request.end();
    callback(request);
  },

  get: function(url, callback) {
    this.makeRequest("GET", url, [], callback);
  },

  post: function(url, params, callback) {
    this.makeRequest("POST", url, params, callback);
  },

  responder: function(request, onComplete) {
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

  getTimeline: function(onComplete) {
    var that = this;
    this.get(this.timelineUrl, function(request) {
      that.responder(request, onComplete);
    });
  },

  postUpdate: function(params, onComplete) {
    var that = this;
    this.post(this.updateUrl, params, function(request) {
      that.responder(request, onComplete);
    });
  },

  linkForUser: function(screenName, text) {
    return "<a href='http://twitter.com/" + screenName + "'>" + text + "</a>";
  },

  htmlForTweet: function(tweet) {
    var user = tweet["user"];
    var screenName = user["screen_name"];
    var avatar = this.linkForUser(screenName, "<img class='avatar' src='" + user["profile_image_url"] + "' />");
    var htmlScreenName = "<h3>" + this.linkForUser(screenName, screenName) + "</h3>";
    var htmlText = "<p>" + tweet["text"] + "</p>";
    return "<div class='tweet'>" + avatar + htmlScreenName + htmlText + "</div>";
  }
};

var MiniTwitter = {
  htmlFor: function(content) {
    var css = "* {padding: 0; margin: 0;}" +
              "html {background-color: #FAFAFA;}" +
              "h3 {display: inline;}" +
              "img {vertical-align: middle; padding-right: 10px;}" +
              "textarea {padding: 3px;}" +
              ".avatar {border: none; height: 48px; width: 48px;}" +
              ".content {width: 80%; margin: 0 auto;}" +
              ".tweet {padding: 5px; background: #FAFAFA; border-bottom: 1px solid #AAA;}";

    var html = "<html><head><title>Twitter Mini</title><style type='text/css'>" +
               css + '<meta content="text/html; charset=utf-8" http-equiv="Content-Type" />' +
               "</style></head><body><div class='content'><h1>Twitter Mini</h1>" + content + "</div></body></html>"

    return html;
  },

  index: function (res) {
    var updateForm = '<form action="/update"' +
                     ' class="status-update-form" id="status_update_form" method="post">' +
                     '<textarea cols="40" rows="3" id="status" name="status"></textarea><br />' +
                     '<input type="submit" value="Mini-Tweet it!" />' +
                     '</form>';

    Twitter.getTimeline(function(content) {
      var data = _.map(JSON.parse(content), function(tweet) {
        return Twitter.htmlForTweet(tweet);
      });

      res.end(MiniTwitter.htmlFor(updateForm + data.join("")));
    });
  },

  update: function (req, data, res) {
    var that = this;
    Twitter.postUpdate(data, function(content) {
      that.index(res);
    });
  }
};

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});

  if (req.url === "/") {
    MiniTwitter.index(res);
  }
  else if (req.url === "/update") {
    var chunks = "";

    req.on('data', function(chunk) {
      chunks += chunk;
    });

    req.on('end', function() {
      MiniTwitter.update(req, chunks, res);
    });
  }
  else {
    res.end("BOGUS");
  }

}).listen(8124, "127.0.0.1");

console.log('Server running at http://127.0.0.1:8124/');

