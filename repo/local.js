/**
 * repo that loads from local FS
 *
 * projectIds = paths
 */
"use strict";
var Promise = require("bluebird");
var exec = require('child-process-promise').exec;
var getenv = require('getenv');
var fs = Promise.promisifyAll(require("fs"));
var path = require("path");
var debug = require("../lib/debug").get("repo-local");

module.exports = exports = Local;

function Local(repoPath /*: string */) {
  const normalizedPath = path.normalize(repoPath);
  debug("repo root " + repoPath);
  

  // not the commited version - useful for files maybe .gitignored (like .sidekickrc)
  // and not allowed to be above repo
  this.fileInWorkingCopy = Promise.method(function(filePath) {
    debug("loading " + filePath);
    // convert to absolute
    const targetPath = path.normalize(path.join(normalizedPath, filePath));
    
    // only way this can happen is via ..'ing
    if(targetPath.indexOf(normalizedPath) !== 0) {
      throw new Error("cannot-load-file-above-repo");
    }

    return fs.readFileAsync(targetPath, { encoding: "utf8" })
      .then(function(content) {
        return {
          path: filePath,
          content: content,
        };
      });
  }),

  // we only want working copy now
  this.file = this.fileInWorkingCopy;
}



