"use strict";

var _ = require("lodash");
var Promise = require("bluebird");
var Local = require("./local");
const fs = Promise.promisifyAll(require("fs"));

var fixturesPath = __dirname + "/../test/fixtures/";

describe("local repo", function() {
  const self = this;

  before(_.partial(toggleTestRepo,fixturesPath, true));
  after(_.partial(toggleTestRepo,fixturesPath, false));

  before(function() {
    self.repo = new Local(fixturesPath);
  })

  it('provides content', function() {
    return self.repo.file("fake_analyser.js")
      .then((f) => {
        assert.match(f.content, /node/);
      })
  })

  it('provides path', function() {
    return self.repo.file("fake_analyser.js")
      .then((f) => {
        assert.match(f.path, /fake/);
      })
  })

  it('will not load files relatively above the repo', function() {
    return assert.isRejected(self.repo.file("/etc/hosts"));
  })

  it('will not load absolute paths above the repo', function() {
    return assert.isRejected(self.repo.file("../../package.json"));
  })


  // this is defunct, currently. we always load off disk
  xit("can find the sha and content for a path in a commit", function(done) {

    repo._catFile(__dirname + "/..", "4c9be78dc27b546c31bcddbd207ee5976aae777a", "package.json")
      .nodeify(function(err, res) {
        if(err) return done(err);
        assert.match(res.content, /runner/);
        done();
      })

  });

  function toggleTestRepo(repo, on, cb) {
    var promise = on ? fs.renameAsync(repo + "/git", repo + "/.git") :
         fs.renameAsync(repo + "/.git", repo + "/git");
    promise.nodeify(cb); 
  }

});
