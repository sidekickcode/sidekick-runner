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

  var log = debug.get("main");

  setup = _.defaults(setup || {}, {
    analyserConfig: {},
    analysersPath: ANALYSERS_PATH,
  });

  var successfulAndFailedAnalysers = loadAnalysers(setup); 
  var configsLoaded = successfulAndFailedAnalysers.then(function(analysers) {
    return loadAnalyserConfig(analysers[0], setup)
  });

  log("analysis starting");

  var repo = typeof setup.repo.file === "function" ? setup.repo : require("./repo/" + setup.repo);


  return Promise.join(configsLoaded, successfulAndFailedAnalysers, function(configs, analysers) {
    var loadedAnalysers = analysers[0] || [];
    var failedAnalysers = analysers[1] || [];

    var analysis = new CommitAnalysis({
      paths: setup.paths,
      path: setup.path,
      projectId: setup.path,
      ref: setup.commitRef,
      repo: repo,
      // TODO ignoring commit level for now
      commitLevel: [],
      fileLevel: loadedAnalysers,
    });
    analysis.configLoaded = configsLoaded;

    analysis.once("start", function() {
      _.each(failedAnalysers, function(failed) {
        analysis.emit("error", failed.reason());
      });
    });

    return analysis;
  });
};

function loadAnalysers(setup) {
  return settleAll(_.map(setup.analyserIds, function(name) {
      analyser.load(setup.analysersPath + name);
    }))
    .then(function(loaded) {
      return _.partition(loaded, "isFulfilled"); 
    })
}

function loadAnalyserConfig(analysers, setup) {
  return analysers.map(function(analyser) {

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

    return settleAll(pathsToContent)
    .then(function(p2c) {
      config.configFiles = _.transform(p2c, function(all, p) {
        if(p.isFulfilled()) {
          var pair = p.value();
          all[pair[0]] = pair[1];
        }
      }, {});
      log("loaded content for " + analyser.analyser);
      var jsonConfig = JSON.stringify(config);
      analyser.configJSON = jsonConfig;
    });
  });
}

function CannotLoadAnalyser(name, err) {
  Error.captureStackTrace(this, this.constructor);
  this.analyser = name;
  this.message = "cannot load " + name + ": " + err.message;
}
require('util').inherits(CannotLoadAnalyser, Error);

function settleAll(xs) {
  return Promise.all(_.invoke(xs, "reflect"));
}
