"use strict";

exports.get = function(name) {
  if(name === "node") {
    return "node";
  } else {
    throw Error("missing interpreter");
  }
};

