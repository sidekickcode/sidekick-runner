// main interface to start the analysis process
"use strict";

var _ = require("lodash");
var CommitAnalysis = require("./commit_analysis");
var analyser = require("./analyser");
var Promise = require("bluebird");
var args = require("../lib/args");

var debug = require("../lib/debug");

var ANALYSERS_PATH = __dirname + "/../../analysers/";

exports.run = function(setup) {
  var analysis = exports.create(setup);

  analysis.loadAndRun();

  return analysis;
};

exports.create = function(setup) {

  args.present(setup, "paths", "path", "commitRef", "analyserIds", "repo");

  var log = debug.get("sidekick-runner:main");

  var analysersPath = setup.analysersPath || ANALYSERS_PATH;

  var failedAnalysers = [];

  var analysers = _.transform(setup.analyserIds, function(all, name) {
    try {
      var loaded = analyser.load(analysersPath + name);
      all.push(loaded);
    } catch(e) {
      failedAnalysers.push(new CannotLoadAnalyser(name, e));
    }
  }, []);

  setup = _.defaults(setup || {}, {
    analyserConfig: {},
  });

  log("analysis starting with " + JSON.stringify(setup));

  var repo = typeof setup.repo.file === "function" ? setup.repo : require("./repo/" + setup.repo);

  var analysis = new CommitAnalysis({
    paths: setup.paths,
    path: setup.path,
    projectId: setup.path,
    ref: setup.commitRef,
    repo: repo,
    // TODO ignoring commit level for now
    commitLevel: [],
    fileLevel: analysers,
  });

  log(JSON.stringify(setup, null, 4));

  var configsLoaded = analysers.map(function(analyser) {

    if(!analyser.configurable) {
      return Promise.resolve(true);
    }

    var files = analyser.configFiles || [];

    var pathsToContent = _.map(files, function(path) {
      return repo.fileInWorkingCopy(setup.path, setup.commitRef, path)
        .then(function(file) {
          return [file.path, file.content];
        });
    });

    // prep each analyser with json (we don't read it, maybe as well stringify once, ASAP
    // as it'll later be fed into analysers in JSON format)
    var config = setup.analyserConfig[analyser.analyser] || {};

    return Promise.settle(pathsToContent)
    .then(function(p2c) {
      config.configFiles = _.transform(p2c, function(all, p) {
        if(p.isFulfilled()) {
          var pair = p.value();
          all[pair[0]] = pair[1];
        }
      }, {});
      var jsonConfig = JSON.stringify(config);
      log(jsonConfig);
      analyser.configJSON = jsonConfig;
    });
  });

  analysis.loadAndRun = function() {
    analysis.result = Promise.all(configsLoaded)
      .then(function() {

        // FIXME yes, super ugly, waiting
        // for ppl to have time to attach
        // listeners. should really make analyser load async
        setTimeout(function() {
          _.each(failedAnalysers, function(err) {
            analysis.emit("error", err);
          });
        }, 0);

        return analysis.run();
      });
  };

  analysis.configLoaded = configsLoaded;

  return analysis;
};

function CannotLoadAnalyser(name, err) {
  Error.captureStackTrace(this, this.constructor);
  this.analyser = name;
  this.message = "cannot load " + name + ": " + err.message;
}
require('util').inherits(CannotLoadAnalyser, Error);
