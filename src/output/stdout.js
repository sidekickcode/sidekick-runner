var log = require("chained-logger").create("[output] ");
var Promise = require("bluebird");

module.exports = function(observed) {
  var byPath = {};

  return new Promise(function(resolve, reject) {

    observed
      // commit level
      .on("start", function(analyser) {
        log("started");
      })
      .on("end", function(err) {
        log("done");
        console.log(JSON.stringify(byPath));
        resolve();
      })
      // file-level
      .on("meta", function(file, analyser, result) {
        log("meta for: " + file.path);
        set(file.path, "meta", result.meta);
      })
      // file
      .on("fileStart", function(path) {
        log("file start: " + path);
      })
      .on("fileCodeqs", function(file, analyser, result) {
        set(file.path, "codeqs", result.codeqs);
      })
      .on("fileUserErrors", function(file, analyser, result) {
        set(file.path, "userErrors", result.userErrors);
      })
      .on("fileAnalyserError", function(file, analyser, err) {
        set(file.path, "errors", err);
      })
      .on("fileEnd", function(err, fileAnalyser) {
        log("file end: " + fileAnalyser.file.path);
      });

  });

  function log(msg) {
    console.error(msg);
  }

  function set(path, k, v) {
    var forPath = preparePath(path);
    if(Array.isArray(v)) {
      forPath[k] = forPath[k].concat(v);
    } else {
      forPath[k].push(v);
    }
  }

  function preparePath(path) {
    return byPath[path] = byPath[path] || {
      codeqs: [],
      meta: [],
      userErrors: [],
      errors: [],
    };
  }

  function output() {
  }

};
