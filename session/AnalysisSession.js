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
const events = require("../../common/events");
const EventEmitter = require("events").EventEmitter;
const inherits = require("util").inherits;

const analysis = require("../../analysis");

const uuid = require("uuid");

module.exports = exports = AnalysisSession;

function AnalysisSession(plan, repo) {
  const self = this;

  EventEmitter.call(self);

  // @type {[path: string]: {[analyserId: string]: Array<meta> | Error }}
  const analysisByPathAndAnalyser = {};

  // mutable stuff
  var expired = false;
  var currentAnalysis = null;

  // public API
  self.state = function() {
    return analysisByPathAndAnalyser;
  };

  self.start = function() {
    log("start " + JSON.stringify(self.definition));

    var initialAnalysis = run()
      .catch(function(err) {
        log.error("error" + err);
      })

    self.emit("started");

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

  function run() {
    return getFilesForAnalysis()
    .then(function(files) {
      log.debug(`analysing ${files.length} files`);
      return analyse(_.pluck(files, "path"));
    });
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

