var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs"));
var path = require("path");


exports.file = function(repoPath, ref, filePath) {
  return fs.readFileAsync(path.join(repoPath, filePath), { encoding: "utf8" })
    .then(function(content) {
      return {
        path: filePath,
        content: content,
      };
    });
};


var KB = 1024;
// 20mb
var MAX_FILE = 20000 * KB;

