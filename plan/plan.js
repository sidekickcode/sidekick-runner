// @flow
"use strict";

const Git = require("./git");
const _ = require("lodash");
const Promise = require("bluebird");

/*:: import type { PlanSource, Analyser, Plan, AnalyserLanguageSet, Target, RawPlan, Repo, PlanTask, SingleFileTask } from "../types" */

exports.forTarget = Promise.method(function(opts /*: PlanSource */) /*: Promise<Plan> */ {

  switch(opts.target.type) {
  case "git": return Git.plan(opts).then(createPlan);
  default: throw Error(`unknown repo type ${opts.target.type}`);
  }

});

exports.withAnalyserConfig = function(plan, config) {
  return createPlan(assignAnalyserConfig(plan, config));
}

exports.createFromRaw = createPlan;

// value object
function createPlan(raw/*: RawPlan */) /*: Plan */ {
  return {
    raw: raw,
    perFileTasks() /*: Array<SingleFileTask> */ {
      return _.flatten(_.map(raw.byAnalysers, function(byAnalyser) {
        return _.map(byAnalyser.paths, function(path) {
          return {
            analysers: byAnalyser.analysers,
            path: path,
          } 
        })
      }));
    }
  }
}

function assignAnalyserConfig(plan, config) {
  const byName = _.indexBy(config, "name");

  const byAnalysers = _.map(plan.raw.byAnalysers, function(item) {
    const analysers = _.map(item.analysers, function(analyser) {
      return _.defaults(byName[analyser.name], analyser);
    });

    return _.defaults({ analysers }, item);
  });

  return _.defaults({ byAnalysers }, plan.raw);
}

