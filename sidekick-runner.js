// @flow
/*:: import type { RunnerConfig } from "./types" */
// main interface to start the analysis process
"use strict";

const _ = require("lodash");
const Analysis = require("./analysis");
const Promise = require("bluebird");
const args = require("./lib/args");

const debug = require("./lib/debug");

const planner = require("./plan");
const repo = require("./repo");

exports.create = function(setup/*: RunnerConfig */) {
  const repository = setup.repo || repo.forTarget(setup.target, setup);

  return planner.forTarget(setup.target, setup.analysers, repo, setup)
    .then(function(plan) {
      return new Analysis({
        plan: plan,
        repo: repository,
        fileLevel: setup.analysers,
      });
    })
};
