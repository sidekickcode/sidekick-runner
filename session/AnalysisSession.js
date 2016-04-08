// @flow
/**
 * handles process of analysing , interactive
 * in that we can change files and reanalyse
 *
 * also holds the current analysis
 * state so the UI can query it later
 */
"use strict";

const git = require("@sidekick/git-helpers");
const Promise = require("bluebird");
const _ = require("lodash");
const EventEmitter = require("events").EventEmitter;
const inherits = require("util").inherits;

const Analysis = require("../analysis");

const uuid = require("uuid");

const log = require("../lib/debug").get("analysis-session");

/*:: import type { AnalysisSessionSetup, AnalysisState } from "../types" */

module.exports = exports = AnalysisSession;

function AnalysisSession(opts /*: AnalysisSessionSetup */) {
  const self = this;

  EventEmitter.call(self);

  const analysisByPathAndAnalyser /*: AnalysisState */ = {};

  // mutable stuff
  var expired = false;
  var currentAnalysis = null;

  // public API
  self.state = function() {
    return analysisByPathAndAnalyser;
  };

  self.start = function() {
    log("start");

    var initialAnalysis = createAnalysis()

    self.emit("started", initialAnalysis);

    process.nextTick(() => initialAnalysis.run())

    return initialAnalysis;
  }

  self.expired = function() {
    return Boolean(this._expired);
  }

  self.dispose = _.once(function() {
    // TODO only when UI
    // analysisByPathAndAnalyser = {};
    expired = true;
    log("disposed");
    if(currentAnalysis) {
      currentAnalysis.stop();
      currentAnalysis = null;
    }

    self.start = function() {
      log.error("attempted to start defunct process");
    }
  })

  return;

  // private API

  function createAnalysis() {
    return new Analysis(opts.analysisSetup); 
  }

  function handleFileAnalysisResult(err, file, analyser, result) {
    if(err) {
      setResult(err);
    } else {
      log(`got ${result.meta.length} meta from ${analyser.analyser} for ${file.path}`);
      setResult(result.meta);
    }

    function setResult(result) {
      setOrGetObject(analysisByPathAndAnalyser, file.path)
        [analyser.analyser] = result;

      var analyserForWire = _.pick(analyser, "analyser", "version", "displayName", "itemType");

      // @type Error, { path: string }, { analyser, version }, [Result]
      self.emit("fileAnalyserEnd", err, { path: file.path }, analyserForWire, result);
    }
  }

}

inherits(AnalysisSession, EventEmitter);

function setOrGetObject(o, k) {
  return o[k] || (o[k] = {});
}

