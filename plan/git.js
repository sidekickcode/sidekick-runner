// @flow
/**
 * creates an AnalysisPlan based on a git repo
 */
"use strict";

const git = require("@sidekick/git-helpers");
const _ = require("lodash");
const log = require("debug")("git-plan");
const repoConfig = require("@sidekick/common/repoConfig");
const userSettings = require("@sidekick/common/userSettings");

userSettings.load();
log('setting gitBin to : ' + userSettings.getGitBin());
git.setGitBin(userSettings.getGitBin());

/*:: import type { PlanSource, Plan } from "../types" */

exports.plan = function plan(opts/*:  PlanSource */) /*: Promise<Plan> */ {

  const vcsTarget = opts.target;
  const repoPath = vcsTarget.path;
  const beforeSha = vcsTarget.versus;
  const afterSha = vcsTarget.compare;

  const repoConfig = opts.repoConfig;

  return getFilesForAnalysis()
    .then(createPlan)

  function createPlan(files) {
    log("create plan");

    const allPaths = _.pluck(files, "path");
    const isAnalysed = {};

    const tasks = [];

    _.each(repoConfig.analysersByLanguages(), function(analysers, language) {
      var toAnalyse = repoConfig.includedPaths(allPaths, language);

      _.each(toAnalyse, (path) => isAnalysed[path] = true)

      tasks.push({
        paths: toAnalyse,
        analysers: analysers,
      });
    });


    const unanalysed = _.reject(files, _.propertyOf(isAnalysed));

    return {
      notAnalysed: unanalysed,
      byAnalysers: tasks,
    };
  }

  function getFilesForAnalysis() {
    if(isFullScanAnalysis()) {
      return git.allFiles(repoPath);
    } else {
      return git.filesWithModificationsAsync(repoPath, { before: beforeSha, after: afterSha })
    }
  }

  function isFullScanAnalysis() {
    return !beforeSha;
  }
}
