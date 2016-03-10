var Promise = require("bluebird");

module.exports = function(observed) {
  var byPath = {};

  return new Promise(function(resolve, reject) {

    observed
      // commit level
      .on("start", function(analyser) {
      })
      .on("end", function(err) {
        if(err)
          reject(err);
        else
          resolve(byPath);
      })
      // file
      .on("fileCodeqs", function(file, analyser, result) {
        set(file.path, "codeqs", result.codeqs);
      })
      .on("fileUserErrors", function(file, analyser, result) {
        set(file.path, "userErrors", result.userErrors);
      })
      .on("fileAnalyserError", function(file, analyser, err) {
        set(file.path, "errors", err);
      });

  });

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

};

