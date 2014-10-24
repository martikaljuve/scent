'use strict';
var ActionType, Entity, Symbol, actionPool, bData, fast, listPool, log, poolAction, poolList, symbols, _;

log = (require('debug'))('scent:action');

_ = require('lodash');

fast = require('fast.js');

Symbol = require('es6').Symbol;

bData = Symbol('internal data of the action type');

symbols = require('./symbols');

Entity = require('./entity');

ActionType = function(identifier) {
  var actionType;
  if (identifier == null) {
    throw new TypeError('expected identifier of an action type');
  }
  if (this instanceof ActionType) {
    actionType = this;
  } else {
    actionType = Object.create(ActionType.prototype);
  }
  actionType[symbols.bName] = identifier;
  actionType[bData] = {};
  return Object.freeze(actionType);
};

ActionType.prototype.trigger = function(entity) {
  var action, argIndex, data, dataArg, i, target, val, _i, _len;
  action = poolAction();
  action.time = Date.now();
  if (entity instanceof Entity) {
    argIndex = 1;
    action.entity = entity;
  } else {
    argIndex = 0;
    action.entity = null;
  }
  if (arguments.length > argIndex && _.isPlainObject(dataArg = arguments[argIndex])) {
    action.get = function(prop) {
      return dataArg[prop];
    };
  }
  for (i = _i = 0, _len = arguments.length; _i < _len; i = ++_i) {
    val = arguments[i];
    if (i >= argIndex) {
      action.push(val);
    }
  }
  data = this[bData];
  if (data.buffer) {
    target = data.buffer;
  } else {
    if (data.list == null) {
      data.list = poolList();
    }
    target = data.list;
  }
  target.push(action);
};

ActionType.prototype.each = function(iterator) {
  var action, data, _i, _len, _ref, _ref1;
  if (!(iterator && _.isFunction(iterator))) {
    throw new TypeError('expected iterator function for the each call');
  }
  data = this[bData];
  if (data.buffer == null) {
    data.buffer = poolList();
  }
  if (!((_ref = data.list) != null ? _ref.length : void 0)) {
    return;
  }
  _ref1 = data.list;
  for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
    action = _ref1[_i];
    iterator.call(iterator, action);
  }
};

ActionType.prototype.finish = function() {
  var action, data, _i, _len, _ref;
  data = this[bData];
  if (data.list) {
    _ref = data.list;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      action = _ref[_i];
      action.length = 0;
      poolAction(action);
    }
    data.list.length = 0;
    poolList(data.list);
    data.list = null;
  }
  data.list = data.buffer;
  data.buffer = null;
};

ActionType.prototype.toString = function() {
  return "ActionType " + this[symbols.bName];
};

listPool = [];

poolList = function(add) {
  if (add) {
    return listPool.push(add);
  }
  if (!listPool.length) {
    return [];
  }
  return listPool.pop();
};

actionPool = [];

poolAction = function(add) {
  if (add) {
    return actionPool.push(add);
  }
  if (!actionPool.length) {
    return [];
  }
  return actionPool.pop();
};

module.exports = Object.freeze(ActionType);