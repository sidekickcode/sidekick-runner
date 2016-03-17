// main interface to start the analysis process
"use strict";

var _ = require("lodash");
var CommitAnalysis = require("./commit_analysis");
var analyser = require("./analyser");
var Promise = require("bluebird");
var args = require("../lib/args");

var debug = require("../lib/debug");

exports.create = function(setup) {
  args.present(setup, "paths", "path", "commitRef", "repo");

  setup = _.defaults(setup || {}, {
    analyserConfig: {},
  });

  var repo = typeof setup.repo.file === "function" ? setup.repo : require("./repo/" + setup.repo);

  var analysis = new CommitAnalysis({
    paths: setup.paths,
    path: setup.path,
    projectId: setup.path,
    ref: setup.commitRef,
    repo: repo,
    // TODO ignoring commit level for now
    commitLevel: [],
    fileLevel: setup.analysers,
  });

  return analysis;
};
