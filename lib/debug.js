"use strict";

var debug = require("debug");

exports.get = function(name) {
  return debug;
}

exports.setDebug = function(to) {
  debug = to; 
}
