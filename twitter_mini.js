var http = require('http');
var sys = require('sys');
var fs = require('fs');
require('underscore');

exports.encodeCredentials = function(creds) {
  var base64_encode = require('base64').encode;
  var Buffer = require('buffer').Buffer;
  var buf = new Buffer(creds);
  return base64_encode(buf);
}

var mussedCreds = fs.readFileSync(".creds", "utf8");

exports.TwitterApi = {
  creds: mussedCreds.substring(0, mussedCreds.length - 1),

  protocol: 'http',
  apiHost: 'api.twitter.com',

  timelineUrl: "/1/statuses/friends_timeline.json",
  updateUrl: "/1/statuses/update.json",

  client: http.createClient(80, this.apiHost),

  headers: function() {
    return {'host': this.apiHost,
            'Authorization': 'Basic ' + exports.encodeCredentials(this.creds)}
  },

  makeRequest: function(method, url, params, callback) {
    var request = this.client.request(method, url, this.headers());
    request.write(params);
    request.end();
    callback(request);
  },

  // TODO: test
  get: function(url, callback) {
    this.makeRequest("GET", url, [], callback);
  },

  // TODO: test
  post: function(url, params, callback) {
    this.makeRequest("POST", url, params, callback);
  },

  // TODO: test
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

  // TODO: test
  getTimeline: function(onComplete) {
    var that = this;
    this.get(this.timelineUrl, function(request) {
      that.responder(request, onComplete);
    });
  },

  // TODO: test
  postUpdate: function(params, onComplete) {
    var that = this;
    this.post(this.updateUrl, params, function(request) {
      that.responder(request, onComplete);
    });
  },

  // TODO: test
  linkForUser: function(screenName, text) {
    return "<a href='http://twitter.com/" + screenName + "'>" + text + "</a>";
  },

  // TODO: test
  htmlForTweet: function(tweet) {
    var user = tweet["user"];
    var screenName = user["screen_name"];
    var avatar = this.linkForUser(screenName, "<img class='avatar' src='" + user["profile_image_url"] + "' />");
    var htmlScreenName = "<h3>" + this.linkForUser(screenName, screenName) + "</h3>";
    var htmlText = "<p>" + tweet["text"] + "</p>";
    return "<div class='tweet'>" + avatar + htmlScreenName + htmlText + "</div>";
  }
};

exports.MiniTwitter = {
  // TODO: move into separate view file (node template?)
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

  // TODO: test
  index: function (res) {
    var that = this;
    var updateForm = '<form action="/update"' +
                     ' class="status-update-form" id="status_update_form" method="post">' +
                     '<textarea cols="40" rows="3" id="status" name="status"></textarea><br />' +
                     '<input type="submit" value="Mini-Tweet it!" />' +
                     '</form>';

    exports.TwitterApi.getTimeline(function(content) {
      var data = _.map(JSON.parse(content), function(tweet) {
        return exports.TwitterApi.htmlForTweet(tweet);
      });

      res.end(that.htmlFor(updateForm + data.join("")));
    });
  },

  // TODO: test
  update: function (req, data, res) {
    var that = this;
    exports.TwitterApi.postUpdate(data, function(content) {
      that.index(res);
    });
  },
};

// TODO: test
exports.serverResponder = function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});

  if (req.url === "/") {
    exports.MiniTwitter.index(res);
  }
  else if (req.url === "/update") {
    var chunks = "";

    req.on('data', function(chunk) {
      chunks += chunk;
    });

    req.on('end', function() {
      exports.MiniTwitter.update(req, chunks, res);
    });
  }
  else {
    res.end("BOGUS");
  }
};

