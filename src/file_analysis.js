/**
 * applies all single-file analysers to a file
 *
 * ## Events
 *
 * ```javascript
 * fileStart(File)
 * fileEnd(err || null, File)
 * fileAnalyserEnd(err || null, File, Analyser, AnalyserResult)
 * ```
 */
"use strict";

var _ = require("lodash");
var args = require("../lib/args");
var Promise = require("bluebird");
var asyncQ = require("async-q");
var os = require("os");
var analyserControl = require("./analyser");
var debug = require("../lib/debug");

module.exports = exports = run;

function run(opts) {
  args.present(opts, "analysers", "file", "emit");
  var file = opts.file;
  var logPrefix = "sidekick-runner:file-analysis:" + file.path;
  var log = debug.get(logPrefix);
  var path = opts.path;
  var emit = opts.emit;
  var runNext = runAnalyser;
  emit("fileStart", opts.file);

  // for now going on the theory we'll schedule an analyser per cpu, with
  // the probable gaps for transmission giving breathing space to the small
  // amount of work everything else is doing
  var queue = asyncQ.queue(function(item) {
    return runNext(item);
  }, os.cpus().length);

  var done = Promise.all(queue.push(opts.analysers));


  done.finally(
    _.partial(emit, "fileEnd", null, file)
  );

  return {
    stop: function() {
      runNext = _.noop;
      log("stopped");
    },
    promise: done,
  };

  function runAnalyser(analyser) {
    var analyserLog = debug.get(logPrefix + ":" + analyser.analyser);
    analyserLog("start");

    var END_EVENT = "fileAnalyserEnd";

    var result = analyserControl.run(analyser, path, file);

    result.done(
      handleResult,
      function(err) {
        analyserLog("end error: " + err.message);
        analyserLog(err.stack);
        emit(END_EVENT, err, file, analyser);
      }
    );

    var done = result.then(_.noop, _.noop);

    return done;

    function handleResult(result) {
      analyserLog("end with meta");
      result.meta = _.map(result.meta, _.partial(analyserControl.applyDefaultsToMeta, analyser));
      emit(END_EVENT, null, file, analyser, result);
    }
  }
}

