"use strict";

var Promise = require("bluebird");
var concatStream = require("concat-stream");
var spawn = require("child_process").spawn;
var _ = require("lodash");
var jsonWithComments = _.compose(JSON.parse, require("strip-json-comments"));
var fs = Promise.promisifyAll(require("fs"));
var path = require("path");

var interpreters = require("./interpreters");

var ERRORS = exports.errors = {
  MISSING_ANALYSER: "missing-analyser",
  OUTPUT_NOT_JSON: "output not JSON",
  INVALID_OUTPUT: "expected either codeqs or meta in output",
  UNEXPECTED_EXIT_CODE: "non zero exit code",
  TERMINATED_BY_SIGNAL: "analyser terminated early by signal",
  USER_ERROR: "analyser detected user error",
  TIMEOUT: "analyser did not produce output in time",
};

var log = require("../lib/debug").get("file-analyser");

exports.MAX_TIME_SECONDS = 60;

// run analyser to completion
exports.run = function(analyser, path, file) {
  var env = {};

  var child = exports.start(analyser, { path: path, filePath: file.path, env: env });

  child.stdin.end(file.content);
  return child._exitedPromise;
};

// start analyser
exports.start = function(analyser, opts) {
  opts = opts || {};
  opts.env = opts.env || {};

  
  var command = analyser.command.split(" ");
  var child = spawn(_.first(command), _.rest(command), {
    env: _.defaults(opts.env, process.env),
    cwd: analyser.path,
  });

  // Promise
  // - turning this into a promise is a pain, we can either 'error' or 'exit'
  // - unless we get a normal exit with code, reject
  //
  // race it with a timeout too
  var timeout;
  child._exitedPromise = createExitedPromise();

  child._exitedPromise.then(cleanup, cleanup);

  child.stdoutContents = stream2promise(child.stdout);
  child.stderrContents = stream2promise(child.stderr);

  writeInitialInput();

  return child;

  function writeInitialInput() {
    var perFileConfig = JSON.stringify({ path: opts.path, filePath: opts.filePath });
    child.stdin.write(analyser.configJSON || "{}");
    child.stdin.write("\n");
    child.stdin.write(perFileConfig);
    child.stdin.write("\n");
  }

  function cleanup(v) {
    clearTimeout(timeout);
  }

  function createExitedPromise() {
    return new Promise(function(resolve, reject) {
      child.once("error", errorHandler);
      child.once("exit", exitHandler);

      timeout = setTimeout(function() {
        reject(new AnalysisFailed(ERRORS.TIMEOUT));
        child.removeListener("error", errorHandler);
        child.removeListener("exit", exitHandler);

        child.kill();
      }, exports.MAX_TIME_SECONDS * 1000);

      function exitHandler(code, signal) {
        // no code means signal
        if(code == null) {
          reject(new AnalysisFailed(ERRORS.TERMINATED_BY_SIGNAL, { signal: signal }));
        } else {
          Promise.props({
            stdout: child.stdoutContents,
            stderr: child.stderrContents,
          })
          .then(
            _.partial(processResult, code)
          )
          .done(resolve, reject);
        }
      }

      function errorHandler(err) {
        switch(err.code) {
        case "ENOENT":
          log("failed to run analyser due to missing file", err.stack);
          return reject(new AnalysisFailed(ERRORS.MISSING_ANALYSER, {
            path: analyser.command,
          }));
        }
        reject(err);
      }
    });
  }
};

var AnalysisFailed = exports.AnalysisFailed = function(message, extra) {
  Error.captureStackTrace(this, this.constructor);
  this.name = "AnalysisFailed";
  this.message = message;
  _.extend(this, extra || {});
};

require('util').inherits(AnalysisFailed, Error);

// provide config to a multiple file analyser
exports.config = function(child, conf) {
  return new Promise(function(resolve, reject) {
    child.stdin.write(JSON.stringify(conf) + "\n", resolve);
  });
};

// provide a file to a multiple file analyser
exports.file = function(child, file) {
  return new Promise(function(resolve, reject) {
    child.stdin.write(JSON.stringify(file) + "\n", resolve);
  });
};

// handle the result of an analyser
// possible results:
// - non-0 exit code: analyser crash
// - non-JSON
// - userErrors: couldn't parse but identified why
// - 0 + meta: successfully parsed
function processResult(code, output) {
  var state = { code: code, stderr: output.stderr + "", stdout: output.stdout + ""};

  if(code !== 0) {
    var msg = "Exited with exit code '" + code + "'";
    captureDiagnosticsForUnhandledFail(msg);
    return Promise.reject(new AnalysisFailed(ERRORS.UNEXPECTED_EXIT_CODE, state));

  } else {

    try {
      var parsed = JSON.parse(output.stdout);
    } catch(e) {
      captureDiagnosticsForUnhandledFail("Could not parse output as JSON");
      return Promise.reject(new AnalysisFailed(ERRORS.OUTPUT_NOT_JSON, state));
    }

    if(parsed.userErrors && parsed.userErrors.length > 0) {
      log("detected invalid input");
      return Promise.reject(new AnalysisFailed(ERRORS.USER_ERROR, { errors: parsed.userErrors }));
    } else {
      if(!_.isArray(parsed.meta)) {
        captureDiagnosticsForUnhandledFail("invalid exit json");
        return Promise.reject(new AnalysisFailed(ERRORS.INVALID_OUTPUT, state));
      }
      return parsed;
    }
  }

  function captureDiagnosticsForUnhandledFail(msg) {
    log( msg + ", stdout:\n" + output.stdout + "\nstderr:\n" + output.stderr);
  }
}

exports.applyDefaultsToMeta = function applyDefaultsToMeta(defaults, meta) {
  var withDefaults = _.defaults(meta, _.pick(defaults, "category", "kind", "version", "analyser"));
  return withDefaults;
};

exports.endOfInput = function(child) {
  child.stdin.end();
};

exports._prepareConfig = prepareConfig;

function prepareConfig(parsed) {
  if(parsed.bin) {
    parsed.command = parsed.bin;
  } else {
    parsed.command = scriptInvocation(parsed);
  }

  parsed.configFiles = parsed.configFiles || [];
  return parsed;
}

function stream2promise(stream) {
  return new Promise(function(resolve, reject) {
    stream.pipe(concatStream(resolve));
  });
}

function scriptInvocation(config) {
  var interpreter = interpreters.get(config.interpreter);
  return interpreter + " " + path.join(config.path, config.script);
}



function event2resolve(emitter, event) {
  return new Promise(function(resolve, reject) {
    emitter.once(event, resolve);
  });
}
function event2reject(emitter, event, transform) {
  return new Promise(function(resolve, reject) {
    emitter.once(event, transform ? _.compose(reject, transform) : reject);
  });
}
