var Promise = require("bluebird");
var exec = require('child-process-promise').exec;
var getenv = require('getenv');
var fs = Promise.promisifyAll(require("fs"));
var path = require("path");

var gitBin = "git";

// not the commited version - useful for files maybe .gitignored (like .sidekickrc)
// and not allowed to be above repo
exports.fileInWorkingCopy = Promise.method(function(repoPath, ref, filePath) {
  repoPath = path.normalize(repoPath);
  // convert to absolute
  var targetPath = path.normalize(path.join(repoPath, filePath));

  // only way this can happen is via ..'ing
  if(targetPath.indexOf(repoPath) !== 0) {
    throw new Error("cannot-load-file-above-repo");
  }

  return fs.readFileAsync(targetPath, { encoding: "utf8" })
    .then(function(content) {
      return {
        path: filePath,
        content: content,
      };
    });
});

// we only want working copy now
exports.file = exports.fileInWorkingCopy;

exports._catFile = catFile;

exports.setGitBin = function(bin) {
  gitBin = bin;
};

function catFile(repoPath, ref, path) {
  var scopedCommand = scopedExec.bind(null, repoPath);
  path = path.replace(/^\//, '');

  return Promise.props({
    path: path,
    content: scopedCommand(gitBin + " show " + ref + ":" + path).get("stdout"),
  });
}


var KB = 1024;
// 20mb
var MAX_FILE = 20000 * KB;

function scopedExec(path, cmd) {
  return exec("cd " + path + " && " + cmd, {
    silent: true,
    maxBuffer: MAX_FILE,
  });
}

