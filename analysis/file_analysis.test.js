"use strict";

const Analysis = require("./analysis");
const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const _ = require("lodash");
const Local = require("../repo/local");
const plan = require("../plan");

var analyserModule = require("./analyser");
var ORIGINAL_MAX_TIME = analyserModule.MAX_TIME_SECONDS;

var fixturesPath = __dirname + "/../test/fixtures/";
var repoPath = fixturesPath;

describe('file level analysis', function() {
  
  var heard = [];

  before(_.partial(toggleTestRepo,fixturesPath, true));
  after(_.partial(toggleTestRepo,fixturesPath, false));

  before(function() {
    analyserModule.MAX_TIME_SECONDS = 0.5;
  });

  after(function() {
    analyserModule.MAX_TIME_SECONDS = ORIGINAL_MAX_TIME;
  });

  before(function() {

    var paths = [
      "file_analysis_test_analysis_target.js",
    ];

    var analysers = [
      "file_analysis_test_exit_1_analyser",
      "file_analysis_test_exit_correct",
      "file_analysis_test_exit_user_errors",
      "file_analysis_test_exit_malformed",
      "file_analysis_test_exit_non_json_analyser",
      "file_analysis_test_exit_signal",
      "file_analysis_test_timeout",
      "file_analysis_test_configured",
      "missing_analyser",
    ].map(function(n) {
      return {
        analyser: n,
        command: "node " + __dirname + "/../test/fixtures/" + n + "/" + n + ".js",
        path: __dirname + "/../test/fixtures/" + n + "/",
        configJSON: "{}",
      };
    });

    var analysis = new Analysis({
      repo: new Local(repoPath),
      plan: plan.createFromRaw({
        byAnalysers: [{
          paths: paths,
          analysers: analysers,
        }],
      }),
    })

    // snoop into all emitted events (only way of subscribing to all)
    analysis.emit = function(name) {
      heard.push({
        event: name,
        data: [].slice.call(arguments, 1),
      })
    };

    return analysis.run();
  });

  describe('file level events', function() {
    it('emits "fileStart"', function() {
       assert(_.findWhere(heard, { event: "fileStart" })); 
    })  

    it('emits "fileEnd"', function() {
       assert(_.findWhere(heard, { event: "fileEnd" })); 
    })  
  })

  describe('exiting with meta', function() {
    var exit;
    before(function() {
      exit = findExit("file_analysis_test_exit_correct");
    });

    it('has exit event', function() {
      assert.isDefined(exit);
    })

    it('exit with no error', function() {
      assertNoError(exit);
    })
  })

  describe('exiting with user errors', function() {
    var exit;
    before(function() {
      exit = findExit("file_analysis_test_exit_user_errors");
    });

    it('has exit event', function() {
      assert.isDefined(exit);
    })

    it('exit with error', function() {
      assertError(exit, /user error/);
    })
      
  })

  describe('exiting with unexpected JSON structure', function() {
    var exit;
    before(function() {
      exit = findExit("file_analysis_test_exit_malformed");
    });

    it('has exit event', function() {
      assert.isDefined(exit);
    })

    it('exit with error', function() {
      assertError(exit, /expected.*meta in output/);
    })
      
  })

  describe('exiting emitted non-JSON', function() {
    var exit;
    before(function() {
      exit = findExit("file_analysis_test_exit_non_json_analyser");
    });

    it('has exit event', function() {
      assert.isDefined(exit);
    })

    it('exit with error', function() {
      assertError(exit, /not JSON/);
    })
      
  })

  describe('missing analyser', function() {

    var error;
    before(function() {
      var event = _.find(heard, function(event) {
        return event.event === "fileAnalyserEnd"
          && event.data[2].analyser === "missing_analyser";
      });

      assert(event, "couldn't find error");

      error = event.data[0];
    })

    it('fires an error', function() {
      assert.isDefined(error);
    })

    it('error has description', function() {
      assert.match(error.message, /missing-analyser/);
    })
  })

  describe('analyser killed via signal', function() {
   var exit;
    before(function() {
      exit = findExit("file_analysis_test_exit_signal");
    });

    it('has exit event', function() {
      assert.isDefined(exit);
    })

    it('exit with error', function() {
      assertError(exit, /by signal/);
    })

  })

  describe('analyser exits unexpectedly', function() {
   var exit;
    before(function() {
      exit = findExit("file_analysis_test_exit_1_analyser");
    });

    it('has exit event', function() {
      assert.isDefined(exit);
    })

    it('exit with error', function() {
      assertError(exit, /non zero/);
    })

  })

  describe('configuration', function() {

    var exit;
    var configPassedToAnalyser;
    before(function() {
      exit = findExit("file_analysis_test_configured");
      
      // the fake analyser just puts the configPassedToAnalyser object
      // it receives from analyser-configPassedToAnalyser into a single meta
      // so we can see it
      configPassedToAnalyser = getOutput(exit).meta[0].config;
      assert(configPassedToAnalyser, "stub analyser didn't work");
    })


    it('has exit event', function() {
      assert.isDefined(exit);
    })

    it('exit with no error', function() {
      assertNoError(exit);
    })

    it('is passed file content', function() {
      assert.match(configPassedToAnalyser.content, /x \+ 1/)
    })

    it('is not passed config files above the repo', function() {
      assert.notProperty(configPassedToAnalyser.configFiles, '../file_analysis_config_fixture_above_repo.json');
    })

    it('is passed config files requested as strings', function() {
      assert.match(configPassedToAnalyser.configFiles['file_analysis_config_fixture.json'], /"readOk": true/);
    })

    it('is not passed absolute config paths', function() {
      assert.notProperty(configPassedToAnalyser.configFiles, '/etc/passwd');
    })

    it('is only passed expected config', function() {
      // whitelist for paranoia :)
      assert.deepEqual(_.keys(configPassedToAnalyser.configFiles), ['file_analysis_config_fixture.json']);
    })

  })


  function findExit(analyser) {
    var found = _.filter(heard, function(e) {
      return e.event === "fileAnalyserEnd"
       && getAnalyser(e).analyser === analyser;
    });
    assert.lengthOf(found, 1, "should have exactly one exit");
    return found[0];
  }

  function getAnalyser(event) {
    return event.data[2];
  }

  function getError(event) {
    return event.data[0];
  }

  function getOutput(event) {
    return event.data[3];
  }

  function assertNoError(exit) {
    assert(!getError(exit), "shouldn't have error")
  }

  function assertError(exit, msg) {
    var error = getError(exit);
    assert.isObject(error, "should have error")
    if(msg) {
      assert.match(error.message, msg);
    }
  }

  function toggleTestRepo(repo, on, cb) {
    var promise = on ? fs.renameAsync(repo + "/git", repo + "/.git") :
         fs.renameAsync(repo + "/.git", repo + "/git");
    promise.nodeify(cb); 
  }

})

