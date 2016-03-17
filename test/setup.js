process.env.NODE_ENV = 'test';
global.assert = require("chai").assert;
var sinon = require("sinon");
sinon.assert.expose(global.assert, { prefix: "spy" });
require("pprint").expose();
