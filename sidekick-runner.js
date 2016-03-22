// main interface to start the analysis process
"use strict";

var _ = require("lodash");
var CommitAnalysis = require("./analysis/commit_analyser");
var analyser = require("./analyser");
var Promise = require("bluebird");
var args = require("../lib/args");

var debug = require("../lib/debug");

var planner = require("../plan");

exports.create = function(setup) {

  return planner.forTarget(target, analysers, repo, setup)
    .then(function(plan) {
      return new CommitAnalysis({
        plan: plan,
        repo: repo,
        fileLevel: setup.analysers,
      });
    })

  return analysis;
};

function instanceOrType(type, option, setup) {
  return option === "string" ? new (require("./repo/" + option))(setup) : option;
}
