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
var util = require("util");
var _ = require("lodash");
var asyncQ = require("async-q");
var args = require("../lib/args");
var Promise = require("bluebird");
var EventEmitter = require("events").EventEmitter;

var debug = require("../lib/debug");

var MultipleFileAnalyser = require("./multiple_file_analyser");
var analyseFile = require("./file_analysis");
var Agent = require("../lib/agent");

var proxy = require("../lib/proxy_events");

module.exports = exports = Analysis;

function Analysis(opts) {
  args.dependencies(this, opts, "repo", "plan");
  this.log = debug.get("analysis");

  this._currentFile = null;
}


Agent.inherits(Analysis);

_.extend(Analysis.prototype, {

  run: function() {
    this.emit("start", this);

    if(_.isEmpty(this.paths)) {
      return this._finish();
    }
    this.log("starting with " + _.pluck(this.fileLevel, "analyser").join(", "));


    var self = this;

    // analyse one file at a time
    var queue = asyncQ.queue(function(path) {
      // important we look up function as we process queue, as we
      // disable the queue processing on stop
      return self._analyseFile(path);
    }, 1);

    var complete = Promise.all(queue.push(this.paths))

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

  _analyseFile: function(path) {
    this.emit("fileStart", path, this);

    return this.repo.file(this.projectId, this.ref, path)
      .then(start.bind(this), function(err) {
        this.log("can't load file " + path + ": " + err);
      }.bind(this));

    function start(file) {

      var analysisEvents = new EventEmitter;

      this._currentFile = analyseFile({
        emit: function() {
          return analysisEvents.emit.apply(analysisEvents, arguments);
        },
        file: file,
        analysers: this.fileLevel,
      });

      this._currentFile
        .promise
        .finally(function() {
          analysisEvents.removeAllListeners();
        });

      // TODO we should pass to commit level analyser once reinstated

      proxy(this, analysisEvents, "fileEnd");
      proxy(this, analysisEvents, "fileAnalyserEnd");

      return this._currentFile.promise;
    }

  },

  toString: function() {
    return "<Analysis>";
  },


});

