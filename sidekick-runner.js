// main interface to start the analysis process
"use strict";

var _ = require("lodash");
var CommitAnalysis = require("./analysis/commit_analyser");
var analyser = require("./analyser");
var Promise = require("bluebird");
var args = require("../lib/args");

var debug = require("../lib/debug");

var planner = require("../plan");

exports.create = function(target, analysers) {


  return planner.forTarget(target, analysers)
    .then(function(plan) {
      return new CommitAnalysis({
        plan: plan,
        repo: repo,
        fileLevel: setup.analysers,
      });
    })


  setup = _.defaults(setup || {}, {
    analyserConfig: {},
  });

  var repo = typeof setup.repo === "string" ? new (require("./repo/" + setup.repo))(setup) : setup.repo;


  return analysis;
};
