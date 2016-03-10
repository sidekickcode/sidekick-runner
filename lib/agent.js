/**
 * an agent models a long-lived process, providing an `end(err,this)` life-cycle
 * event and a logged event-emitter.
 *
 * It will log to the `this.log` logger.
 *
 * ## events
 *
 * ### end(err, this)
 *
 * an agent is dead after its `end` event fires. if it fires with an err
 * the agent died unexpectedly, otherwise it is a normal exit
 *
 * ### error(err)
 *
 * a non-fatal error
 */
var EventEmitter = require("events").EventEmitter;
var _ = require("lodash");
var util = require("util");
var debug = require("../lib/debug");

function Agent() {}

util.inherits(Agent, EventEmitter);

module.exports = exports = Agent;

_.extend(Agent.prototype, {

  log: debug.get("unknown-agent"),

  /**
   * use this from subclasses
   */
  _finish: function(err) {
    if(err) {
      this.log("exiting with err: " + err);
    }
    this.emit("end", err, this);
  },

  emit: function(name) {
    this.log(name);
    return EventEmitter.prototype.emit.apply(this, arguments);
  },

  expired: function() {
    return Boolean(this._expired);
  },

});

exports.inherits = function(constructor) {
  util.inherits(constructor, Agent);
};
