// @flow
/*:: import type { Repo, Target, RunnerConfig } from "../types"; */
"use strict";

const Local = require("./local");

exports.forTarget = function forTarget(target/*: Target */, setup/*: RunnerConfig */) /*: Repo */ {
  switch(target.type) {
  case "git": return new Local();
  default: throw Error(`unknown repo type ${target.type}`);
  }
}
