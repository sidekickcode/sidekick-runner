"use strict";

const _ = require('lodash');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require("fs"));
const path = require('path');

const SAM = require('@sidekick/analyser-manager');

const debug = require("../lib/debug").get("configure");


exports.ensureAnalysers = ensureAnalysers;


function ensureAnalysers(opts/*: { analysers: Array<Analyser>, repo: Repo, shouldInstall: Boolean } */) /*: Promise<Array<RunnableAnalyser>> */ {
  
  const manager = new SAM(opts.analyserSource);

  const configByAnalyser = getConfig();

  manager.promise = manager.init()
    .then(() => {
      return Promise.all(_.map(opts.analysers, installAndLoadConfigForAnalyser));
    })

  return manager;

  function installAndLoadConfigForAnalyser(analyser) {
    const installed = analyser.local ? {}
                                     : manager.installAnalyser(analyser.name, analyser.version)

    return Promise.resolve(installed)
      .then((found/*: { path: string, config: object } */) => {
        return _.defaults({ path: found.path }, analyser, found.config) 
      })
      .then(function(configured) {
        return configByAnalyser
          .then(_.property(analyser.name))
          .then(function(configByFile) {

            // TODO this is really hack
            configured.command = configured.command ||
                (path.join(configured.interpreter + " ", configured.path, "/",configured.script));

            configured.configJSON = JSON.stringify(configByFile); 

            return configured;
          });
      })
  }

   function getConfig() {
     const configs = opts.analysers.map((analyser) => {
      return loadConfig(opts.repo, analyser)
        .then((config) => {
          debug("loaded user config for " + analyser.name)

          return [analyser.name, config]
        })
    });

    return Promise.all(configs)
      .then(_.object)
   }
}



function loadConfig(repo, analyser) {
  if(!analyser.configurable) {
    return Promise.resolve({});
  }

  const files = analyser.configFiles || [];

  // settle an array of promises, and drop any missing
  const pathsToContent = _.map(files, function(path) {
    return repo.file(path)
      .then(function(file) {
        return [file.path, file.content];
      });
  });

  // we don't fail if we're missing a config file, just provide
  // as much as poss and leave it up to analyser to decide whether to fail
  return Promise.settle(pathsToContent)
  .then(function(p2c) {
    const byFile = _.transform(p2c, function(all, p) {
      if(p.isFulfilled()) {
        const pair = p.value();
        all[pair[0]] = pair[1];
      }
    }, {});

    return byFile;
  });
}
