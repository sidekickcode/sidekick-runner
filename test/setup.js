process.env.NODE_ENV = 'test';
var chai = require("chai");
global.assert = chai.assert;
var sinon = require("sinon");
sinon.assert.expose(global.assert, { prefix: "spy" });
require("pprint").expose();

var chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);
