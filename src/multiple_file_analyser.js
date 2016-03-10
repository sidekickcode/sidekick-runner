var util = require("util");
var _ = require("lodash");
var args = require("../lib/args");
var Agent = require("../lib/agent");

var analyserControl = require("./analyser");
var debug = require("../lib/debug");

module.exports = MutipleFileAnalyser;

function MutipleFileAnalyser(opts) {
  throw new Error("needs to be updated");
  args.dependencies(this, opts, "analyser");
  this.log = debug.get("sidekick-runner:multiple-file-analyser:" + this.analyser.analyser);
}

Agent.inherits(MutipleFileAnalyser);

_.extend(MutipleFileAnalyser.prototype, {

  run: function() {
    this.emit("start", this);

    this.child = analyserControl.start(this.analyser);

    analyserControl.handleExit(this.child)
      .done(
        this._handleExit.bind(this),
        this._handleFailure.bind(this)
      );
  },

  _handleFailure: function(err) {
    this.file = function ignoreFilesAfterCrash() {
      this.log("ignoring file sent after process failed");
    };
    this.endOfInput = function alreadyClosed() {};
    this._finish(err);
  },

  _handleExit: function(result) {
    if(!this.sentEndOfInput) {
      this._finish(new Error("Analyser exited before input complete"));
      return;
    }

    _.each(result.metaByPath, function(meta, path) {
      meta = _.map(meta, _.partial(analyserControl.applyDefaultsToMeta, this.analyser));
      this.emit("meta", {path: path}, this.analyser, {meta: meta});
    }, this);

    this._finish();
  },

  file: function(file) {
    if(this.sentEndOfInput) return;
    analyserControl.file(this.child, file)
      .then(function() {
        this.emit("sent", file.path);
      }.bind(this));
  },

  endOfInput: function() {
    this.sentEndOfInput = true;

    analyserControl.endOfInput(this.child);

    this.emit("waiting");

    // closes stdin, process should exit and go to handleExit
  },

});
