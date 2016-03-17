"use strict";

var main = require("../../src/main");
var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs"));
var sinon = require("sinon");

var _ = require("lodash");

describe('running analyser directly', function() {

  var endSpy;
  var startSpy;
  var fileAnalyserEndSpy;

  function createSpies() {
    endSpy = sinon.spy();
    startSpy = sinon.spy();
    fileAnalyserEndSpy = sinon.spy();
  }


  describe('successful run', function() {
    var analyserIds = [
      "jshint",
      "eslint",
      "jscs",
      "js-todos",
    ];

    before(function(done) {
      createSpies();
      return startAnalysis({
        path: "unused",
        commitRef: "unused",
        paths: [
          "simple.js",
        ].map(function(p) {
          return __dirname  + "/../fixtures/" + p;
        }),
        repo: { 
          file: fsRepo,
          fileInWorkingCopy: fsRepo,
        },
        analyserIds: analyserIds,
      })
      .then(function(analysis) {
        analysis.on("end", endSpy);
        analysis.on("start", startSpy);
        analysis.on("fileAnalyserEnd", fileAnalyserEndSpy);

        analysis.run();
        
        return analysis.result;
      });
    });

    fulfilledBasicContract()

    it('emits meta event', function() {
      assert.notEqual(fileAnalyserEndSpy.callCount, 0);
    })

    it('emits usable meta', function() {
      var metaEvents = fileAnalyserEndSpy.args.map(getMetaFromMetaEvent);
      var metaEventsWithMeta = _.filter(metaEvents, function(xs) {
        assert.property(xs, "length", "invalid result object");
        return xs.length > 0;
      });

      assert(metaEventsWithMeta.length > 0 , "no analysers emitted meta");
      var meta = metaEventsWithMeta[0];
      assert.isArray(meta);

      var metaItem = meta[0];
      assert.property(metaItem, "message");
      assert.property(metaItem, "kind");
      assert.isObject(metaItem.location);
    })

    it('reported meta from each analyser', function() {
      var calls = fileAnalyserEndSpy.args;
      var names = _(calls)
        .map(getAnalyserFromMetaEvent)
        .pluck("analyser")
        .unique()
        .value();

      assert.deepEqual(names.sort(), analyserIds.sort());
    })

    function getMetaFromMetaEvent(args) {
      assert(!args[0], "unexpected error: " + args[0]);
      return args[3].meta;
    }

    function getAnalyserFromMetaEvent(args) {
      return args[2];
    }
      
  })
    
  function fulfilledBasicContract() {

    it('emits start', function() {
      assert.spyCalled(startSpy);
    })

    it('emits end', function() {
      assert.spyCalled(endSpy);
    })
    
  }

  function fsRepo(_repoPath, _ref, path) {
    return fs.readFileAsync(path, { encoding: "utf8" })
    .then(function(content) {
      return {
        path: path,
        content: content,
      }
    });
  }

  function startAnalysis(args) {
    var analyser = main.create(args);

    return analyser;
  }
})
