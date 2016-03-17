"use strict";

var debug = require("debug");

exports.get = function(name) {
  return debug("sidekick-runner:" + name);
}

exports.setDebug = function(to) {
  debug = to; 
}
