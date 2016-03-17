"use strict";

var _ = require("lodash");
var repo = require("../src/repo/local");

describe("local repo", function() {

  if(!process.env.CI) {

  it("can find the sha and content for a path in a commit", function(done) {

    var sha = "d4414820dc0699598430fe819b00a28d3f845a4a"

    repo._catFile(__dirname + "/../..", "73f397f6f5ac663a0e42d4822959faa7e116ac4d", "daemon/analysis/jshint/jshint.js")
      .nodeify(function(err, res) {
        if(err) return done(err);
        assert.match(res.content, /JSHINT/);
        done();
      })

  });

  }


});
