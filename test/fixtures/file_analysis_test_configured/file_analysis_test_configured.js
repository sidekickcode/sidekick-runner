#!/usr/bin/env node

var input = require("@sidekick/analyser-common");

input(function(setup) {
  // put the setup object into a single meta
  // so tests can see it
  var output = {
    meta: [{
      config: setup,
    }]
  };

  console.log(JSON.stringify(output));
  process.exit(0);
});
