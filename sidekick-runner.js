// @flow
// main interface to start the analysis process
"use strict";

const _ = require("lodash");
const Promise = require("bluebird");
const path = require("path");
const EventEmitter = require("events").EventEmitter;

const Analysis = require("./analysis");
const AnalysisSession = require("./session");
const args = require("./lib/args");
const planner = require("./plan");
const repo = require("./repo");
const log = require("./lib/debug").get("runner");
const configure = require("./runner/configure");

const repoConfig = require("@sidekick/common/repoConfig");
const proxy = require("proxytron");

/*:: import type { RunnerConfig, AnalysisSetup } from "./types" */

exports.session = function(setup/*: RunnerConfig */) /*: Promise<AnalysisSession> */ {
  return createAnalysisSetup(setup)
    .then(function(analysisSetup) {
      return new AnalysisSession({
        analysisSetup,
      });
    });
}

exports.create = function(setup/*: RunnerConfig */) /*: Promise<Analysis> */ {
  return createAnalysisSetup(setup)
    .promise
    .then((analysisSetup) => {
      new Analysis(analysisSetup)
    })
}

function createAnalysisSetup(setup/*: RunnerConfig */) /*: Promise<AnalysisSetup> */ {

  const events = setup.events || new EventEmitter;

  // state is mutated as we find out more about the situation,
  // it's only assigned to inside this scope
  const state = _.clone(setup);

  state.repo = state.repo || repo.forTarget(setup.target);

  return assign(createRepoConfig, "repoConfig")()
    .then(assign(createAnalysers, "analysers"))
    .then(assign(createPlan, "plan"))
    .then(function() {
      // make a runnable plan with fully configured analysers
      state.plan = planner.withAnalyserConfig(state.plan, state.analysers);
    })
    .catch(explainFailure(`failed to start analysis, planning failed because: `))
    .then(function() {
      return _.pick(state, "repo", "plan");
    });

  function assign(handler, target) {
    return function() {
      log("creating " + target);
      return handler(state, events)
        .then((item) => {
          log("created %s", target)
          state[target] = item
        })
    }
  }

  function explainFailure(explained) {
    return (err) => Promise.reject(Error(explained + err.stack));
  }
};

function createPlan(state) {
  return planner.forTarget(state);
}

function createRepoConfig(state) {
  return repoConfig.load(state.target.path)
}

function createAnalysers(state, events) {
  log("%j", state)
  const ensuring = configure.ensureAnalysers({
    analysers: state.repoConfig.allAnalysers(),
    repo: state.repo,
    shouldInstall: state.shouldInstall,
    // install into a subdir of this module's location
    analyserSource: path.join(__dirname, '/installed-analysers'),
  });

  proxy({
    from: ensuring,
    to: events,
    events: {
      downloading: null,
      downloaded: null,
      installing: null,
      installed: null,
    }
  });

  return ensuring.promise;
}



