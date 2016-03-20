"use strict";

exports.get = getInterpreter;

function getInterpreter(name) {
  if(name === "node") {
    return interpreter.bundledNodeExecutable();
  }

  throw new Error("Unrecognised interpreter '" + name + "'");
}
