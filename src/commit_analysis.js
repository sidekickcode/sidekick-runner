/**
 * the whole process of analysing a commit - runs through each
 * file and each analyser, and passed each file to every
 * commit-wide analyser
 *
 * ## CommitAnalysis(opts)
 *
 * opts:
 * - paths [String] paths to analyse
 * - fileLevel [Analyser]
 * - commitLevel [Analyser]
 * - repo { file: path -> Promise(File) }
 * - projectId - Any - how do you identify a project for repo
 * - ref - Any - how does repo identify a commit
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

module.exports = exports = CommitAnalysis;

function CommitAnalysis(opts) {
  args.dependencies(this, opts, "commitLevel", "fileLevel", "paths", "repo", "projectId", "ref", "path");
  this.log = debug.get("commit");

  this._currentFile = null;
}


Agent.inherits(CommitAnalysis);

_.extend(CommitAnalysis.prototype, {

  run: function() {
    this.emit("start", this);

    if(_.isEmpty(this.paths)) {
      return this._finish();
    }
    this.log("starting with " + _.pluck(this.commitLevel.concat(this.fileLevel), "analyser").join(", "));

    this.commitLevelAgents = _.map(this.commitLevel, function(analyser) {
      var agent = new MultipleFileAnalyser({
        analyser: analyser
      });

      proxy(this, agent, "meta");
      proxy(this, agent, "error", "fileError");
      return agent;
    }, this);

    var endPromises = _.map(this.commitLevelAgents, function(agent) {
      return new Promise(function(resolve, reject) {
        agent.once("end", resolve);
      });
    });

    _.invoke(this.commitLevelAgents, "run");

    var self = this;

    // analyse one file at a time
    var queue = asyncQ.queue(function(path) {
      // important we look up function as we process queue, as we
      // disable the queue processing on stop
      return self._analyseFile(path);
    }, 1);

    var complete = Promise.all(queue.push(this.paths))
      .then(signalAndWaitForCommitScoped.bind(this));

    complete
      .finally(function() {
        this._finish(null, this);
      }.bind(this));

    return complete;

    function signalAndWaitForCommitScoped() {
      _.invoke(this.commitLevelAgents, "endOfInput");
      return Promise.all(endPromises);
    }

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
        path: this.path,
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
    return "<CommitAnalysis>";
  },


});

