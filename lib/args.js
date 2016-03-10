var _ = require("lodash");

exports.dependencies = function(forObj,fromObj) {
  var deps = [].slice.call(arguments, 2);
  exports.present(fromObj, deps);
  return _.extend(forObj, _.pick(fromObj, deps));
};

exports.present = function(obj,keys) {
  _.each(exports.varArgsOrArrayToArray([].slice.call(arguments, 1)), function(key) {
    if(obj[key] === undefined) throw new Error("Missing " + key);
  });
};

// allows you to create fns taking <Array | arg, [arg2...]>
exports.varArgsOrArrayToArray = function(args) {
  if(args.length === 1 && _.isArray(args[0])) return args[0];
  return args;
};


exports.assertAndReturn = function(x, msg) {
  if(x) return x;
  throw new Error(msg || "Must be passed value!");
};
