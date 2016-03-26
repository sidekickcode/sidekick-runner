// @flow
/**
 * the whole process of analysing a plan - runs through each
 * file and each analyser, and passed each file to every
 * commit-wide analyser
 *
 * ## Analysis(opts)
 *
 * opts:
 * - repo { file: path -> Promise(File) }
 * - plan
 *
 */
const util = require("util");
const _ = require("lodash");
const asyncQ = require("async-q");
const args = require("../lib/args");
const Promise = require("bluebird");
const EventEmitter = require("events").EventEmitter;

const debug = require("../lib/debug");

const analyseFile = require("./file_analysis");
const Agent = require("../lib/agent");

const proxy = require("../lib/proxy_events");

/*:: import type { AnalysisSetup, Repo, Plan } from "../types" */

module.exports = exports = Analysis;


function Analysis(opts/*: AnalysisSetup */) {
  this.repo = opts.repo;
  this.plan = opts.plan;

  this.log = debug.get("analysis");

  this._currentFile = null;
}


Agent.inherits(Analysis);

_.extend(Analysis.prototype, {

  run: function() {
    this.emit("start", this);

    const list = this.plan.perFileTasks();

    this.log("starting analysis of %s tasks", list.length);

    // analyse one file at a time
    const queue = asyncQ.queue(function(path) {
      // important we look up function as we process queue, as we
      // disable the queue processing on stop
      return this._analyseFile(path);
    }.bind(this), 1);

    const complete = Promise.all(queue.push(list))

    complete
      .finally(function() {
        this._finish(null, this);
      }.bind(this));

    return complete;
  },

  stop: function() {
    // stop queue and finish
    this._analyseFile = _.noop;
    if(this._currentFile) {
      this._currentFile.stop();
    }
    this._finish(null, this);
    this.log("stopped");
  },

  _analyseFile: function(task) {
    this.emit("fileStart", task.path, this);

    return this.repo.file(task.path)
      .then(start.bind(this), function(err) {
        this.log("can't load file " + task.path + ": " + err);
        // don't reject here, as it kills the queue
        this.emit("error", Error("can't analyse file: " + err.message));
      }.bind(this));

    function start(file) {

      const analysisEvents = new EventEmitter;

      this._currentFile = analyseFile({
        emit: function() {
          return analysisEvents.emit.apply(analysisEvents, arguments);
        },
        file: file,
        analysers: task.analysers,
      });

      this._currentFile
        .promise
        .finally(function() {
          analysisEvents.removeAllListeners();
        });

      proxy(this, analysisEvents, "fileEnd");
      proxy(this, analysisEvents, "fileAnalyserEnd");

      return this._currentFile.promise;
    }

  },

  toString: function() {
    return "<Analysis>";
  },


});

