"use strict";

var _ = require("lodash");
var repo = require("./local");

describe("local repo", function() {

  // this is defunct, currently. we always load off disk
  xit("can find the sha and content for a path in a commit", function(done) {

    repo._catFile(__dirname + "/..", "4c9be78dc27b546c31bcddbd207ee5976aae777a", "package.json")
      .nodeify(function(err, res) {
        if(err) return done(err);
        assert.match(res.content, /runner/);
        done();
      })

  });

});
