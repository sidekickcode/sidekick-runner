/**
 * creates an AnalysisPlan based on a git repo
 */
"use strict";

function GitPlanner(vcsTarget) {

  const repoPath = vcsTarget.path;
  const beforeSha = vcsTarget.beforeId;
  const afterSha = vcsTarget.afterId;

  this.plan = function() {
    return Promise.join(getConfig(), getPaths(), repoPath)
  };

  function getPaths() {
    return getFilesForAnalysis().then(partitionNonAnalysedFiles);
  }

  function createPlan(repoConfigAtCommit, paths, repo) {
    return _.map(repoConfigAtCommit.languages(), function(languageId) {
      var toAnalyse = repoConfigAtCommit.includedPaths(paths, languageId);
      return {
        paths: toAnalyse,
        analysers: repoConfigAtCommit.analysers(languageId),
        repo: repo,
      };
    }, []);
  }

  function partitionNonAnalysedFiles(files) {
    log("partitionNonAnalysedFiles");
    return getConfig()
    .then(function(repoConfigAtCommit) {
      log(JSON.stringify([files, repoConfigAtCommit]));
      var allPaths = _.pluck(files, "path");

      var allAnalysedPaths = _.transform(repoConfigAtCommit.languages(), function(all, language) {
        var toAnalyse = repoConfigAtCommit.includedPaths(allPaths, language);
        _.each(toAnalyse, function(path) {
          all[path] = true;
        });
      });

      return _.groupBy(files, function(file) {
        return allAnalysedPaths[file.path] ? "analysed" : "notAnalysed";
      });
    });
  }

  function getFilesForAnalysis() {
    if(isFullScanAnalysis()) {
      return git.allFiles(repoPath);
    } else {
      return git.filesWithModificationsAsync(repoPath, beforeSha)
    }
  }

  function isFullScanAnalysis() {
    return !beforeSha;
  }

  function getConfig() {
    return RepoConfig.load(repoPath)
      .catch(function(e) {
        self.emit("error", e);
        return Promise.reject(e);
      });
  }
}
