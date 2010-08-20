var vows = require('vows'),
    assert = require('assert')
    sys = require('sys')
    twitterMini = require('../twitter_mini');

vows.describe('TwitterMini').addBatch({
  'encode credentials': {
    topic: function() { return twitterMini.encodeCredentials; },
    'works': function(topic) {
      assert.equal("Zm9vYmFy", topic("foobar"));
    }
  },

  'TwitterApi': {
    topic: twitterMini.TwitterApi,
    'makes the callback': function(topic) {
      topic.client = {
        fakeRequest: {
          write: function(params) {
            this.writeCalledWith = params;
          },
          end: function() {
            this.endCalled = true;
          }
        },

        request: function(method, url, headers) {
          this.requestCalledWith = [method, url, headers];
          return this.fakeRequest;
        },
      };

      var fakeCallbackCalledWith = null;
      var fakeCallback = function(req) {
        fakeCallbackCalledWith = req;
      };
      topic.makeRequest("fake method", "fake url", "fake params", fakeCallback);

      assert.deepEqual(topic.client.requestCalledWith, ["fake method", "fake url", topic.headers()]);
      assert.equal("fake params", topic.client.fakeRequest.writeCalledWith);
      assert.equal(true, topic.client.fakeRequest.endCalled);
      assert.equal(topic.client.fakeRequest, fakeCallbackCalledWith);
    }
  }

}).export(module);

