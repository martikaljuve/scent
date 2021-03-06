/*
* The MIT License (MIT)
* Copyright © 2015 Black Dice Ltd.
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
* 
* Version: 0.8.2
*/
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.scent = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';
var Action, ActionType, Entity, Symbol, _, bData, bPool, each$noContext, each$withContext, fast, listPool, log, poolAction, poolList, symbols;

log = (require('debug'))('scent:action');

_ = require('lodash');

fast = require('fast.js');

Symbol = require('es6').Symbol;

bData = Symbol('internal data of the action type');

bPool = Symbol('pool of actions for this type');

symbols = require('./symbols');

Entity = require('./entity');

ActionType = function(name) {
  var actionType;
  if (name == null) {
    throw new TypeError('expected name of an action type');
  }
  if (this instanceof ActionType) {
    actionType = this;
  } else {
    actionType = Object.create(ActionType.prototype);
  }
  actionType[symbols.bName] = name;
  actionType[bData] = {};
  actionType[bPool] = [];
  return actionType;
};

Action = function(type, data1, meta1) {
  this.type = type;
  this.data = data1;
  this.meta = meta1;
};

Action.prototype = Object.create(Array.prototype);

Action.prototype.time = 0;

Action.prototype.type = null;

Action.prototype.data = null;

Action.prototype.meta = null;

Action.prototype.get = function(prop) {
  var ref;
  return (ref = this.data) != null ? ref[prop] : void 0;
};

Action.prototype.set = function(prop, val) {
  if (this.data == null) {
    this.data = {};
  }
  this.data[prop] = val;
  return this;
};

ActionType.prototype.trigger = function(data, meta) {
  var action;
  action = poolAction.call(this);
  action.time = Date.now();
  action.data = data;
  action.meta = meta;
  data = this[bData];
  if (data.buffer) {
    data.buffer.push(action);
  } else {
    if (data.list == null) {
      data.list = poolList();
    }
    data.list.push(action);
  }
  return action;
};

ActionType.prototype.each = function(iterator, ctx) {
  var action, data, fn, i, len, ref, ref1;
  if (!(iterator && _.isFunction(iterator))) {
    throw new TypeError('expected iterator function for the each call');
  }
  data = this[bData];
  if (data.buffer == null) {
    data.buffer = poolList();
  }
  if (!((ref = data.list) != null ? ref.length : void 0)) {
    return;
  }
  fn = ctx ? each$withContext : each$noContext;
  ref1 = data.list;
  for (i = 0, len = ref1.length; i < len; i++) {
    action = ref1[i];
    fn(iterator, action, ctx);
  }
};

each$noContext = function(fn, action) {
  return fn(action);
};

each$withContext = function(fn, action, ctx) {
  return fn.call(ctx, action);
};

ActionType.prototype.finish = function() {
  var action, data, i, len, ref;
  data = this[bData];
  if (data.list) {
    ref = data.list;
    for (i = 0, len = ref.length; i < len; i++) {
      action = ref[i];
      action.data = null;
      action.meta = null;
      poolAction.call(this, action);
    }
    data.list.length = 0;
    poolList(data.list);
    data.list = null;
  }
  data.list = data.buffer;
  data.buffer = null;
};

Object.defineProperties(ActionType.prototype, {
  'size': {
    enumerable: true,
    get: function() {
      var ref;
      return ((ref = this[bData].list) != null ? ref.length : void 0) || 0;
    }
  }
});

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

poolAction = function(add) {
  var pool;
  pool = this[bPool];
  if (add) {
    return pool.push(add);
  }
  if (!pool.length) {
    return new Action(this);
  }
  return pool.pop();
};

module.exports = Object.freeze(ActionType);

},{"./entity":4,"./symbols":8,"debug":undefined,"es6":undefined,"fast.js":undefined,"lodash":undefined}],2:[function(require,module,exports){
'use strict';
var BaseComponent, Component, Map, NoMe, Set, Symbol, _, bData, bPool, bSetup, defineFieldProperty, emptyFields, fast, fieldsRx, identities, identityRx, initializeData, log, poolMap, ref, symbols;

log = (require('debug'))('scent:component');

_ = require('lodash');

fast = require('fast.js');

NoMe = require('nome');

ref = require('es6'), Symbol = ref.Symbol, Map = ref.Map, Set = ref.Set;

symbols = require('./symbols');

bPool = Symbol('pool of disposed components');

bData = Symbol('data array for the component');

bSetup = Symbol('private setup method for component');

identities = fast.clone(require('./primes')).reverse();

fieldsRx = /(?:^|\s)([a-z][a-z0-9]*(?=\s|$))/gi;

identityRx = /(?:^|\s)#([0-9]+(?=\s|$))/i;

Component = function(name, definition) {
  var ComponentType;
  if (definition instanceof Component) {
    return definition;
  }
  if (!_.isString(name)) {
    throw new TypeError('missing name of the component');
  }
  ComponentType = function(data) {
    var component;
    component = this;
    if (!(component instanceof ComponentType)) {
      component = new ComponentType(data);
    }
    initializeData(component, ComponentType.typeFields, data);
    return component;
  };
  ComponentType.prototype = new BaseComponent(name, definition);
  ComponentType.prototype[symbols.bType] = ComponentType;
  Object.setPrototypeOf(ComponentType, Component.prototype);
  return Object.freeze(ComponentType);
};

Component.prototype = Object.create(Function.prototype);

poolMap = new Map;

Component.prototype.pooled = function() {
  var pool;
  if ((pool = poolMap.get(this)) == null) {
    poolMap.set(this, pool = []);
  }
  if (pool.length) {
    return pool.pop();
  }
  return new this;
};

Component.prototype.toString = function() {
  var fields, type;
  type = this.prototype;
  return ("ComponentType `" + type[symbols.bName] + "` #" + type[symbols.bIdentity]) + (!(fields = type[symbols.bFields]) ? "" : " [" + (fields.join(' ')) + "]");
};

Object.defineProperties(Component.prototype, {
  'typeName': {
    enumerable: true,
    get: function() {
      return this.prototype[symbols.bName];
    }
  },
  'typeIdentity': {
    enumerable: true,
    get: function() {
      return this.prototype[symbols.bIdentity];
    }
  },
  'typeFields': {
    enumerable: true,
    get: function() {
      return this.prototype[symbols.bFields];
    }
  },
  'typeDefinition': {
    enumerable: true,
    get: function() {
      var fields;
      return ("#" + this.prototype[symbols.bIdentity]) + (!(fields = this.prototype[symbols.bFields]) ? "" : " " + (fields.join(' ')));
    }
  }
});

Component.disposed = NoMe(function() {
  return this[symbols.bDisposing] = Date.now();
});


/*
 * BaseComponent
 */

BaseComponent = function(name, definition) {
  var field, i, j, len, ref1;
  this[symbols.bName] = name;
  this[bSetup](definition);
  ref1 = this[symbols.bFields];
  for (i = j = 0, len = ref1.length; j < len; i = ++j) {
    field = ref1[i];
    defineFieldProperty(this, field, i);
  }
  return this;
};

BaseComponent.prototype[bSetup] = function(definition) {
  var field, fields, identity, identityMatch, idx, match;
  if (typeof definition === 'undefined' || (definition == null)) {
    this[symbols.bIdentity] = identities.pop();
    return;
  }
  if (typeof definition !== "string") {
    throw new TypeError('optionally expected string definition for component type, got:' + definition);
  }
  fields = null;
  while (match = fieldsRx.exec(definition)) {
    if (fields == null) {
      fields = [];
    }
    if (!~(fast.indexOf(fields, field = match[1]))) {
      fields.push(field);
    }
  }
  if (fields != null) {
    this[symbols.bFields] = Object.freeze(fields);
  }
  if (identityMatch = definition.match(identityRx)) {
    identity = Number(identityMatch[1]);
    if (!~(idx = fast.indexOf(identities, identity))) {
      throw new Error('invalid identity specified for component: ' + identity);
    }
    identities.splice(idx, 1);
  } else {
    identity = identities.pop();
  }
  this[symbols.bIdentity] = identity;
};

BaseComponent.prototype[symbols.bName] = null;

BaseComponent.prototype[symbols.bIdentity] = null;

BaseComponent.prototype[symbols.bFields] = emptyFields = Object.freeze([]);

BaseComponent.prototype[symbols.bChanged] = 0;

BaseComponent.prototype[symbols.bDispose] = Component.disposed;

BaseComponent.prototype[symbols.bRelease] = function() {
  var data, pool;
  if (!this[symbols.bDisposing]) {
    return false;
  }
  delete this[symbols.bDisposing];
  if (data = this[bData]) {
    data.length = 0;
    delete this[symbols.bChanged];
  }
  if (pool = poolMap.get(this[symbols.bType])) {
    pool.push(this);
  }
  return true;
};

BaseComponent.prototype.toString = function() {
  var changed, fields;
  return ("Component `" + this[symbols.bName] + "` #" + this[symbols.bIdentity]) + (!(fields = this[symbols.bFields]) ? "" : (" [" + (fields.join(' ')) + "]") + (!(changed = this[symbols.bChanged]) ? "" : "(changed: " + changed + ")"));
};

BaseComponent.prototype.inspect = function() {
  var field, j, len, ref1, result;
  result = {
    "--typeName": this[symbols.bName],
    "--typeIdentity": this[symbols.bIdentity],
    "--changed": this[symbols.bChanged]
  };
  if (this[symbols.bDisposing]) {
    result['--disposing'] = this[symbols.bDisposing];
  }
  ref1 = this[symbols.bFields];
  for (j = 0, len = ref1.length; j < len; j++) {
    field = ref1[j];
    result[field] = this[field];
  }
  return result;
};

Object.freeze(BaseComponent);

defineFieldProperty = function(target, field, i) {
  return Object.defineProperty(target, field, {
    enumerable: true,
    get: function() {
      var val;
      if (void 0 === (val = this[bData][i])) {
        return null;
      } else {
        return val;
      }
    },
    set: function(val) {
      this[symbols.bChanged] = Date.now();
      return this[bData][i] = val;
    }
  });
};

initializeData = function(component, fields, data) {
  if (!fields.length) {
    return;
  }
  if (data && _.isArray(data)) {
    data.length = fields.length;
    component[bData] = data;
  } else {
    component[bData] = new Array(fields.length);
  }
};

if (typeof IN_TEST !== 'undefined') {
  Component.identities = identities;
}

module.exports = Object.freeze(Component);

},{"./primes":6,"./symbols":8,"debug":undefined,"es6":undefined,"fast.js":undefined,"lodash":undefined,"nome":undefined}],3:[function(require,module,exports){
'use strict';
var Action, Component, Engine, Entity, Lill, Map, NoMe, Node, Set, _, async, bInitialized, fast, fnArgs, log, ref, symbols;

log = (require('debug'))('scent:engine');

_ = require('lodash');

fast = require('fast.js');

fnArgs = require('fn-args');

async = require('async');

NoMe = require('nome');

Lill = require('lill');

ref = require('es6'), Map = ref.Map, Set = ref.Set;

symbols = require('./symbols');

Node = require('./node');

Entity = require('./entity');

Action = require('./action');

Component = require('./component');

bInitialized = symbols.Symbol("engine is initialized");

Engine = function(initializer) {
  var actionHandlerMap, actionMap, actionTypes, actionTypesProcessed, actionsTriggered, addedEntities, componentMap, disposedEntities, engine, engine$update, finishNodeType, getSystemArgs, hashComponent, initializeSystem, initializeSystemAsync, injections, isStarted, nodeMap, nodeTypes, nomeComponentAdded, nomeComponentRemoved, nomeEntityDisposed, processActionType, processActions, processNodeTypes, provide, releasedEntities, systemAnonCounter, systemList, updateNodeType, updatedEntities;
  if (!(this instanceof Engine)) {
    return new Engine(initializer);
  }
  if ((initializer != null) && !_.isFunction(initializer)) {
    throw new TypeError('expected function as engine initializer');
  }
  engine = this;
  isStarted = false;
  componentMap = new Map;
  engine.registerComponent = function(componentType, componentId) {
    var id;
    if (!(componentType instanceof Component)) {
      throw new TypeError('expected component type to engine.registerComponent, got:' + componentType);
      return;
    }
    id = componentId || componentType.typeName;
    if (componentMap.has(id)) {
      log('trying to register component with id %s that is already registered', id);
      return;
    }
    componentMap.set(id, componentType);
  };
  engine.accessComponent = function(componentId) {
    return componentMap.get(componentId);
  };
  engine.createComponent = function(componentId) {
    var componentType;
    componentType = engine.accessComponent(componentId);
    if (!componentType) {
      throw new TypeError('Component ID #{componentId} is not properly registered with engine.');
    }
    return new componentType;
  };
  engine.entityList = Lill.attach({});
  engine.addEntity = function(entity) {
    if (entity instanceof Array) {
      log('Passing array of components to addEntity method is deprecated. Use buildEntity method instead.');
      entity = new Entity(entity, engine.accessComponent);
    }
    Lill.add(engine.entityList, entity);
    addedEntities.push(entity);
    return entity;
  };
  engine.buildEntity = function(components) {
    return engine.addEntity(new Entity(components, engine.accessComponent));
  };
  Object.defineProperty(engine, 'size', {
    get: function() {
      return Lill.getSize(engine.entityList);
    }
  });
  systemList = [];
  systemAnonCounter = 1;
  engine.addSystem = function(systemInitializer) {
    var name;
    if (!(systemInitializer && _.isFunction(systemInitializer))) {
      throw new TypeError('expected function for addSystem call');
    }
    if (~fast.indexOf(systemList, systemInitializer)) {
      throw new Error('system is already added to engine');
    }
    name = systemInitializer[symbols.bName];
    if (!name) {
      name = systemInitializer.name || systemInitializer.displayName || 'system' + (systemAnonCounter++);
      systemInitializer[symbols.bName] = name;
    }
    fast.forEach(systemList, function(storedSystem) {
      if (storedSystem[symbols.bName] === name) {
        throw new TypeError('name for system has to be unique');
      }
    });
    systemList.push(systemInitializer);
    if (isStarted) {
      initializeSystem(systemInitializer);
    }
    return engine;
  };
  engine.addSystems = function(list) {
    var j, len, systemInitializer;
    if (!(list && _.isArray(list))) {
      throw new TypeError('expected array of system initializers');
    }
    for (j = 0, len = list.length; j < len; j++) {
      systemInitializer = list[j];
      engine.addSystem(systemInitializer);
    }
    return engine;
  };
  engine.start = function(done) {
    if ((done != null) && !_.isFunction(done)) {
      throw new TypeError('expected callback function for engine start');
    }
    if (isStarted) {
      throw new Error('engine has been started already');
    }
    if (done) {
      async.each(systemList, initializeSystemAsync, function(err) {
        isStarted = true;
        return done(err);
      });
    } else {
      fast.forEach(systemList, initializeSystem);
      isStarted = true;
    }
    engine.update = engine$update;
    return this;
  };
  engine.update = function() {
    throw new Error('engine needs to be started before running update');
  };
  engine$update = NoMe(function() {
    processActions();
    return processNodeTypes();
  });
  engine.onUpdate = fast.bind(engine$update.notify, engine$update);
  nodeMap = {};
  nodeTypes = Lill.attach({});
  engine.getNodeType = function(componentTypes) {
    var hash, nodeType, validComponentTypes;
    validComponentTypes = Node.validateComponentTypes(componentTypes, engine.accessComponent);
    if (!(validComponentTypes != null ? validComponentTypes.length : void 0)) {
      throw new TypeError('specify at least one component type to getNodeType');
    }
    hash = fast.reduce(validComponentTypes, hashComponent, 1);
    if (nodeType = nodeMap[hash]) {
      return nodeType;
    }
    nodeType = new Node(validComponentTypes, engine.accessComponent);
    nodeMap[hash] = nodeType;
    Lill.add(nodeTypes, nodeType);
    Lill.each(engine.entityList, function(entity) {
      return nodeType.addEntity(entity);
    });
    return nodeType;
  };
  hashComponent = function(result, componentType) {
    return result *= componentType.typeIdentity;
  };
  addedEntities = [];
  updatedEntities = [];
  disposedEntities = [];
  processNodeTypes = function() {
    var entity, j, len;
    updateNodeType(Node.prototype.addEntity, addedEntities);
    updateNodeType(Node.prototype.removeEntity, disposedEntities);
    updateNodeType(Node.prototype.updateEntity, updatedEntities);
    Lill.each(nodeTypes, finishNodeType);
    if (addedEntities.length || disposedEntities.length || updatedEntities.length) {
      return processNodeTypes();
    }
    for (j = 0, len = releasedEntities.length; j < len; j++) {
      entity = releasedEntities[j];
      entity.release();
    }
    releasedEntities.length = 0;
  };
  releasedEntities = [];
  finishNodeType = function(nodeType) {
    return nodeType.finish();
  };
  updateNodeType = function(nodeMethod, entities) {
    var entity, execMethod, j, len;
    if (!entities.length) {
      return;
    }
    execMethod = function(nodeType) {
      return nodeMethod.call(nodeType, this);
    };
    for (j = 0, len = entities.length; j < len; j++) {
      entity = entities[j];
      Lill.each(nodeTypes, execMethod, entity);
      releasedEntities.push(entity);
    }
    entities.length = 0;
  };
  nomeEntityDisposed = Entity.disposed.notify(function() {
    var idx;
    if (!Lill.has(engine.entityList, this)) {
      return;
    }
    if (~(idx = addedEntities.indexOf(this))) {
      addedEntities.splice(idx, 1);
    }
    if (~(idx = updatedEntities.indexOf(this))) {
      updatedEntities.splice(idx, 1);
    }
    disposedEntities.push(this);
    return Lill.remove(engine.entityList, this);
  });
  nomeComponentAdded = Entity.componentAdded.notify(function() {
    if (!Lill.has(engine.entityList, this)) {
      return;
    }
    if (!(~(addedEntities.indexOf(this)) || ~(updatedEntities.indexOf(this)))) {
      return updatedEntities.push(this);
    }
  });
  nomeComponentRemoved = Entity.componentRemoved.notify(function() {
    if (!Lill.has(engine.entityList, this)) {
      return;
    }
    if (!(~(addedEntities.indexOf(this)) || ~(updatedEntities.indexOf(this)))) {
      return updatedEntities.push(this);
    }
  });
  actionMap = new Map;
  actionHandlerMap = new Map;
  actionTypes = Lill.attach({});
  actionsTriggered = 0;
  actionTypesProcessed = new Set;
  engine.getActionType = function(actionName, noCreate) {
    var actionType;
    if (!(actionType = actionMap.get(actionName))) {
      if (noCreate === true) {
        return null;
      }
      actionType = new Action(actionName);
      actionMap.set(actionName, actionType);
      Lill.add(actionTypes, actionType);
    }
    return actionType;
  };
  engine.triggerAction = function(actionName, data, meta) {
    var actionType;
    actionType = engine.getActionType(actionName);
    if (!actionHandlerMap.has(actionType)) {
      log("Action `%s` cannot be triggered. Use onAction method to add handler first.", actionName);
      return engine;
    }
    actionType.trigger(data, meta);
    actionsTriggered += 1;
    return engine;
  };
  engine.onAction = function(actionName, callback) {
    var actionType, map;
    if (!_.isString(actionName)) {
      throw new TypeError('expected name of action for onAction call');
    }
    if (!_.isFunction(callback)) {
      throw new TypeError('expected callback function for onAction call');
    }
    actionType = engine.getActionType(actionName);
    if (!(map = actionHandlerMap.get(actionType))) {
      map = [callback];
      actionHandlerMap.set(actionType, map);
    } else {
      map.push(callback);
    }
    return engine;
  };
  processActions = function() {
    Lill.each(actionTypes, processActionType);
    if (actionsTriggered !== 0) {
      actionsTriggered = 0;
      return processActions();
    }
    return actionTypesProcessed.clear();
  };
  processActionType = function(actionType) {
    var callback, callbacks, j, len;
    if (actionType.size === 0) {
      return;
    }
    if (actionTypesProcessed.has(actionType)) {
      log("Detected recursive action triggering. Action `%s` has been already processed during this update.", actionType[symbols.bName]);
      actionsTriggered -= actionType.size;
      return;
    }
    callbacks = actionHandlerMap.get(actionType);
    if (!(callbacks && callbacks.length)) {
      return;
    }
    for (j = 0, len = callbacks.length; j < len; j++) {
      callback = callbacks[j];
      actionType.each(callback);
    }
    actionType.finish();
    return actionTypesProcessed.add(actionType);
  };
  engine[symbols.bDispose] = function() {
    Entity.disposed.denotify(nomeEntityDisposed);
    Entity.componentAdded.denotify(nomeComponentAdded);
    Entity.componentRemoved.denotify(nomeComponentRemoved);
    nodeTypes.length = 0;
    systemList.length = 0;
    injections.clear();
    Lill.detach(actionTypes);
    actionMap.clear();
    actionHandlerMap.clear();
    addedEntities.length = 0;
    updatedEntities.length = 0;
    disposedEntities.length = 0;
    return isStarted = false;
  };
  initializeSystemAsync = function(systemInitializer, cb) {
    var args, handleError;
    handleError = function(fn) {
      var result;
      result = fast["try"](fn);
      return cb(result instanceof Error ? result : null);
    };
    if (!systemInitializer.length) {
      return handleError(function() {
        return systemInitializer.call(null);
      });
    }
    args = getSystemArgs(systemInitializer, cb);
    if (!~fast.indexOf(args, cb)) {
      return handleError(function() {
        return fast.apply(systemInitializer, null, args);
      });
    } else {
      return fast.apply(systemInitializer, null, args);
    }
  };
  initializeSystem = function(systemInitializer) {
    var args, handleError;
    handleError = function(fn) {
      var result;
      result = fast["try"](fn);
      if (result instanceof Error) {
        throw result;
      }
    };
    if (!systemInitializer.length) {
      return handleError(function() {
        return systemInitializer.call(null);
      });
    }
    args = getSystemArgs(systemInitializer);
    return handleError(function() {
      return fast.apply(systemInitializer, null, args);
    });
  };
  getSystemArgs = function(systemInitializer, done) {
    var args;
    args = fnArgs(systemInitializer);
    fast.forEach(args, function(argName, i) {
      var injection;
      if (done && argName === '$done') {
        injection = done;
      } else {
        injection = injections.has(argName) ? injections.get(argName) : null;
        if (_.isFunction(injection)) {
          injection = injection.call(null, engine, systemInitializer);
        }
      }
      return args[i] = injection;
    });
    return args;
  };
  injections = new Map;
  provide = function(name, injection) {
    if (engine[bInitialized]) {
      throw new Error('cannot call provide for initialized engine');
    }
    if (!((name != null ? name.constructor : void 0) === String && name.length)) {
      throw new TypeError('expected injection name for provide call');
    }
    if (injections.has(name)) {
      throw new TypeError('injection of that name is already defined');
    }
    if (injection == null) {
      throw new TypeError('expected non-null value for injection');
    }
    injections.set(name, injection);
  };
  provide('$engine', engine);
  if (initializer) {
    initializer(engine, provide);
    initializer = null;
  }
  engine[bInitialized] = true;
  return engine;
};

Engine.prototype = Object.create(Function.prototype);

Engine.prototype.toString = function() {
  return "Engine (" + (Lill.getSize(this.entityList)) + " entities)";
};

module.exports = Object.freeze(Engine);

},{"./action":1,"./component":2,"./entity":4,"./node":5,"./symbols":8,"async":undefined,"debug":undefined,"es6":undefined,"fast.js":undefined,"fn-args":undefined,"lill":undefined,"lodash":undefined,"nome":undefined}],4:[function(require,module,exports){
'use strict';
var Component, Entity, Map, NoMe, Symbol, _, arrayPool, bComponentChanged, bComponentProvider, bComponents, bDisposedComponents, bEntity, bSetup, componentIsShared, entityPool, fast, log, poolArray, ref, releaseComponent, symbols, validateComponent, validateComponentType;

log = (require('debug'))('scent:entity');

_ = require('lodash');

NoMe = require('nome');

fast = require('fast.js');

ref = require('es6'), Symbol = ref.Symbol, Map = ref.Map;

Component = require('./component');

symbols = require('./symbols');

bEntity = Symbol('represent entity reference on the component');

bComponents = Symbol('map of components in the entity');

bSetup = Symbol('private setup method for entity');

bComponentChanged = Symbol('timestamp of change of component list');

bDisposedComponents = Symbol('list of disposed components');

bComponentProvider = Symbol('component provided passed to entity');

Entity = function(components, componentProvider) {
  var entity;
  entity = this;
  if (!(entity instanceof Entity)) {
    entity = new Entity;
  }
  entity[bComponents] = new Map;
  entity[bSetup](components, componentProvider);
  return entity;
};

Entity.prototype.add = function(component) {
  var componentType, validComponent;
  if (component && component instanceof Component) {
    validComponent = new component;
  } else {
    validComponent = validateComponent(component, this[bComponentProvider]);
    if (componentIsShared(validComponent, this)) {
      return this;
    }
  }
  if (this.has(componentType = validComponent[symbols.bType])) {
    log('entity already contains component `%s`, consider using replace method if this is intended', componentType.typeName);
    log((new Error).stack);
    return this;
  }
  Entity.componentAdded.call(this, validComponent);
  return this;
};

Entity.prototype.remove = function(componentType) {
  var validComponentType;
  validComponentType = validateComponentType(componentType, this[bComponentProvider]);
  return Entity.componentRemoved.call(this, validComponentType);
};

Entity.prototype.replace = function(component) {
  var validComponent;
  if (component && component instanceof Component) {
    validComponent = new component;
  } else {
    validComponent = validateComponent(component, this[bComponentProvider]);
    if (componentIsShared(validComponent, this)) {
      return this;
    }
  }
  this.remove(validComponent[symbols.bType]);
  Entity.componentAdded.call(this, validComponent);
  return this;
};

Entity.prototype.has = function(componentType, allowDisposed) {
  var validComponentType;
  validComponentType = validateComponentType(componentType, this[bComponentProvider]);
  if (!this[bComponents].has(validComponentType)) {
    return false;
  }
  return this.get(validComponentType, allowDisposed) !== null;
};

Entity.prototype.get = function(componentType, allowDisposed) {
  var component, validComponentType;
  validComponentType = validateComponentType(componentType, this[bComponentProvider]);
  if (!(component = this[bComponents].get(validComponentType))) {
    return null;
  }
  if (component[symbols.bDisposing]) {
    if (allowDisposed === true) {
      return component;
    } else {
      return null;
    }
  }
  return component;
};

Object.defineProperty(Entity.prototype, 'size', {
  enumerable: true,
  get: function() {
    return this[bComponents].size;
  }
});

Object.defineProperty(Entity.prototype, 'changed', {
  enumerable: true,
  get: function() {
    var changed, components, entry;
    if (!(changed = this[bComponentChanged])) {
      return 0;
    }
    components = this[bComponents].values();
    entry = components.next();
    while (!entry.done) {
      changed = Math.max(changed, entry.value[symbols.bChanged]);
      entry = components.next();
    }
    return changed;
  }
});

Entity.componentAdded = NoMe(function(component) {
  if (this[symbols.bDisposing]) {
    log('component cannot be added when entity is being disposed (since %d)', this[symbols.bDisposing]);
    log((new Error).stack);
    return;
  }
  component[bEntity] = this;
  this[bComponents].set(component[symbols.bType], component);
  this[bComponentChanged] = Date.now();
  return this;
});

Entity.componentRemoved = NoMe(function(componentType) {
  var component;
  if (this[symbols.bDisposing]) {
    log('component cannot be removed when entity is being disposed (since %d)', this[symbols.bDisposing]);
    log((new Error).stack);
    return;
  }
  if (component = this[bComponents].get(componentType)) {
    component[symbols.bDispose]();
    this[bComponentChanged] = Date.now();
  }
  return this;
});

entityPool = [];

Entity.pooled = function(components, componentProvider) {
  var entity;
  if (!entityPool.length) {
    return new Entity(components);
  }
  entity = entityPool.pop();
  entity[bSetup](components, componentProvider);
  return entity;
};

Entity.disposed = NoMe(function() {
  var componentEntry, components, results;
  this[symbols.bDisposing] = Date.now();
  components = this[bComponents].values();
  componentEntry = components.next();
  results = [];
  while (!componentEntry.done) {
    componentEntry.value[symbols.bDispose]();
    results.push(componentEntry = components.next());
  }
  return results;
});

Entity.prototype.dispose = Entity.disposed;

Component.disposed.notify(function() {
  var entity, list;
  if (!(entity = this[bEntity])) {
    return;
  }
  if (entity[symbols.bDisposing]) {
    return;
  }
  if (!(list = entity[bDisposedComponents])) {
    list = entity[bDisposedComponents] = poolArray();
  }
  return list.push(this);
});

Entity.prototype.release = function() {
  var cList, component, componentType, dList, i, len;
  cList = this[bComponents];
  if (dList = this[bDisposedComponents]) {
    for (i = 0, len = dList.length; i < len; i++) {
      component = dList[i];
      if (!releaseComponent(component)) {
        continue;
      }
      componentType = component[symbols.bType];
      if (component !== cList.get(componentType)) {
        continue;
      }
      cList["delete"](componentType);
    }
    dList.length = 0;
    poolArray(dList);
    this[bDisposedComponents] = null;
  }
  if (this[symbols.bDisposing]) {
    this[bComponents].forEach(releaseComponent);
    this[bComponents].clear();
    this[bComponentChanged] = null;
    this[bComponentProvider] = null;
    this[symbols.bDisposing] = null;
    entityPool.push(this);
    return true;
  }
  return false;
};

Entity.getAll = function(result) {
  var components, entry;
  if (result == null) {
    result = [];
  }
  if (!(this instanceof Entity)) {
    throw new TypeError('expected entity instance for the context');
  }
  components = this[bComponents].values();
  entry = components.next();
  while (!entry.done) {
    result.push(entry.value);
    entry = components.next();
  }
  return result;
};

componentIsShared = function(component, entity) {
  var inEntity, result;
  if (result = inEntity = component[bEntity] && inEntity !== entity) {
    log('component %s cannot be shared with multiple entities', component);
    log((new Error).stack);
  }
  return result;
};

releaseComponent = function(component) {
  var released;
  released = component[symbols.bRelease]();
  if (released) {
    delete component[bEntity];
  }
  return released;
};

validateComponent = function(component, componentProvider) {
  var providedType;
  if ((component != null ? component[symbols.bType] : void 0) instanceof Component) {
    return component;
  }
  if (component instanceof Component) {
    return new component;
  }
  providedType = typeof componentProvider === "function" ? componentProvider(component) : void 0;
  if (providedType instanceof Component) {
    return new providedType;
  }
  throw new TypeError('invalid component instance for entity');
};

validateComponentType = function(componentType, componentProvider) {
  var providedType;
  if (componentType instanceof Component) {
    return componentType;
  }
  if (componentProvider && (providedType = componentProvider(componentType))) {
    return providedType;
  }
  throw new TypeError('invalid component type for entity');
};

Entity.prototype[bSetup] = function(components, componentProvider) {
  if (components && !(components instanceof Array)) {
    if (_.isFunction(components)) {
      componentProvider = components;
      components = null;
    } else {
      throw new TypeError('expected array of components for entity');
    }
  }
  if (_.isFunction(componentProvider)) {
    this[bComponentProvider] = componentProvider;
  }
  if (components) {
    fast.forEach(components, this.add, this);
  }
};

Entity.prototype.inspect = function() {
  var component, components, dList, entry, i, len, result, resultList;
  result = {
    "--changed": this.changed
  };
  if (this[symbols.bDisposing]) {
    result['--disposing'] = this[symbols.bDisposing];
  }
  if (dList = this[bDisposedComponents]) {
    result['--disposedComponents'] = resultList = [];
    for (i = 0, len = dList.length; i < len; i++) {
      component = dList[i];
      resultList.push(component.inspect());
    }
  }
  components = this[bComponents].values();
  entry = components.next();
  while (!entry.done) {
    component = entry.value;
    result[component[symbols.bName]] = component.inspect();
    entry = components.next();
  }
  return result;
};

arrayPool = [];

poolArray = function(add) {
  if (add) {
    return arrayPool.push(add);
  }
  if (!arrayPool.length) {
    return [];
  }
  return arrayPool.pop();
};

Entity.prototype[symbols.bDispose] = function() {
  log('using symbol bDispose is deprecated, use direct `dispose` method instead');
  log((new Error).stack);
  return this.dispose();
};

Object.defineProperty(Entity.prototype, symbols.bChanged, {
  get: function() {
    log('using bChanged symbol for entity is DEPRECATED, use direct changed property');
    log((new Error).stack);
    return this.changed;
  }
});

module.exports = Object.freeze(Entity);

},{"./component":2,"./symbols":8,"debug":undefined,"es6":undefined,"fast.js":undefined,"lodash":undefined,"nome":undefined}],5:[function(require,module,exports){
'use strict';
var BaseNodeItem, Component, Lill, Map, NodeType, Symbol, _, bData, bType, bValidated, createNodeItem, defineComponentProperty, fast, log, mapComponentName, poolNodeItem, ref, symbols, validateEntity,
  slice = [].slice;

log = (require('debug'))('scent:node');

_ = require('lodash');

fast = require('fast.js');

Lill = require('lill');

ref = require('es6'), Symbol = ref.Symbol, Map = ref.Map;

Component = require('./component');

bType = (symbols = require('./symbols')).bType;

bData = Symbol('internal data for the node type');

NodeType = function(componentTypes, componentProvider) {
  var validComponentTypes;
  if (!(this instanceof NodeType)) {
    return new NodeType(componentTypes, componentProvider);
  }
  validComponentTypes = NodeType.validateComponentTypes(componentTypes, componentProvider);
  if (!(validComponentTypes != null ? validComponentTypes.length : void 0)) {
    throw new TypeError('node type requires at least one component type');
  }
  this[bData] = {
    types: validComponentTypes,
    item: createNodeItem(this, validComponentTypes),
    pool: fast.bind(poolNodeItem, null, []),
    ref: Symbol('node(' + validComponentTypes.map(mapComponentName).join(',') + ')'),
    added: false,
    removed: false
  };
  return Lill.attach(this);
};

NodeType.prototype.entityFits = function(entity) {
  var componentType, i, len, ref1;
  if (entity[symbols.bDisposing]) {
    return false;
  }
  ref1 = this[bData]['types'];
  for (i = 0, len = ref1.length; i < len; i++) {
    componentType = ref1[i];
    if (!entity.has(componentType)) {
      return false;
    }
  }
  return true;
};

NodeType.prototype.addEntity = function() {
  var added, data, entity, nodeItem;
  data = this[bData];
  entity = validateEntity(arguments[0]);
  if (entity[data.ref] || !this.entityFits(entity)) {
    return this;
  }
  if (!(nodeItem = data.pool())) {
    nodeItem = new data.item;
  }
  nodeItem[symbols.bEntity] = entity;
  entity[data.ref] = nodeItem;
  Lill.add(this, nodeItem);
  if (added = data.added) {
    Lill.add(added, nodeItem);
  }
  return this;
};

NodeType.prototype.removeEntity = function() {
  var data, entity, nodeItem, removed;
  data = this[bData];
  entity = validateEntity(arguments[0]);
  if (!(nodeItem = entity[data.ref])) {
    return this;
  }
  if (this.entityFits(entity)) {
    return this;
  }
  Lill.remove(this, nodeItem);
  delete entity[data.ref];
  if (removed = data.removed) {
    Lill.add(removed, nodeItem);
  } else {
    data.pool(nodeItem);
  }
  return this;
};

NodeType.prototype.updateEntity = function() {
  var data, entity;
  data = this[bData];
  entity = validateEntity(arguments[0]);
  if (!entity[data.ref]) {
    return this.addEntity(entity);
  } else {
    return this.removeEntity(entity);
  }
  return this;
};

NodeType.prototype.each = function(fn) {
  var Node$each, args;
  if (arguments.length <= 1) {
    Lill.each(this, fn);
    return this;
  }
  args = Array.prototype.slice.call(arguments, 1);
  Lill.each(this, Node$each = function(node) {
    return fn.apply(null, [node].concat(slice.call(args)));
  });
  return this;
};

NodeType.prototype.find = function(predicate) {
  var Node$find, args;
  if (arguments.length <= 1) {
    return Lill.find(this, predicate);
  }
  args = Array.prototype.slice.call(arguments, 1);
  return Lill.find(this, Node$find = function(node) {
    return predicate.apply(null, [node].concat(slice.call(args)));
  });
};

NodeType.prototype.onAdded = function(callback) {
  var added, data;
  if (!_.isFunction(callback)) {
    throw new TypeError('expected callback function for onNodeAdded call');
  }
  added = (data = this[bData]).added;
  if (!added) {
    data.added = added = [];
    Lill.attach(added);
  }
  added.push(callback);
  return this;
};

NodeType.prototype.onRemoved = function(callback) {
  var data, removed;
  if (!_.isFunction(callback)) {
    throw new TypeError('expected callback function for onNodeRemoved call');
  }
  removed = (data = this[bData]).removed;
  if (!removed) {
    data.removed = removed = [];
    Lill.attach(removed);
  }
  removed.push(callback);
  return this;
};

NodeType.prototype.finish = function() {
  var added, addedCb, data, i, j, len, len1, removed, removedCb;
  data = this[bData];
  if ((added = data.added) && Lill.getSize(added)) {
    for (i = 0, len = added.length; i < len; i++) {
      addedCb = added[i];
      Lill.each(added, addedCb);
    }
    Lill.clear(added);
  }
  if ((removed = data.removed) && Lill.getSize(removed)) {
    for (j = 0, len1 = removed.length; j < len1; j++) {
      removedCb = removed[j];
      Lill.each(removed, removedCb);
    }
    Lill.each(removed, data.pool);
    Lill.clear(removed);
  }
  return this;
};

Object.defineProperties(NodeType.prototype, {
  'head': {
    enumerable: true,
    get: function() {
      return Lill.getHead(this);
    }
  },
  'tail': {
    enumerable: true,
    get: function() {
      return Lill.getTail(this);
    }
  },
  'size': {
    enumerable: true,
    get: function() {
      return Lill.getSize(this);
    }
  },
  'types': {
    enumerable: true,
    get: function() {
      return this[bData]['types'];
    }
  }
});

createNodeItem = function(nodeType, componentTypes) {
  var NodeItem, componentType, i, len;
  NodeItem = function() {};
  NodeItem.prototype = new BaseNodeItem(nodeType);
  for (i = 0, len = componentTypes.length; i < len; i++) {
    componentType = componentTypes[i];
    defineComponentProperty(NodeItem, componentType);
  }
  return NodeItem;
};

defineComponentProperty = function(nodeItemConstructor, componentType) {
  return Object.defineProperty(nodeItemConstructor.prototype, componentType.typeName, {
    enumerable: true,
    get: function() {
      return this[symbols.bEntity].get(componentType, true);
    }
  });
};

BaseNodeItem = function(nodeType) {
  this[symbols.bType] = nodeType;
  return this;
};

BaseNodeItem.prototype[symbols.bType] = null;

BaseNodeItem.prototype[symbols.bEntity] = null;

Object.defineProperty(BaseNodeItem.prototype, 'entityRef', {
  enumerable: true,
  get: function() {
    return this[symbols.bEntity];
  }
});

BaseNodeItem.prototype.inspect = function() {
  var componentType, i, len, ref1, ref2, result;
  result = {
    "--nodeType": this[symbols.bType].inspect(true),
    "--entity": this[symbols.bEntity].inspect()
  };
  ref1 = this[symbols.bType][bData]['types'];
  for (i = 0, len = ref1.length; i < len; i++) {
    componentType = ref1[i];
    result[componentType.typeName] = (ref2 = this[componentType.typeName]) != null ? ref2.inspect() : void 0;
  }
  return result;
};

NodeType.prototype.inspect = function(metaOnly) {
  var data, result, toResult;
  data = this[bData];
  result = {
    "--nodeSpec": data['types'].map(mapComponentName).join(','),
    "--listSize": this.size
  };
  if (metaOnly === true) {
    return result;
  }
  toResult = function(label, source) {
    var target;
    if (!(source && Lill.getSize(source))) {
      return;
    }
    target = result[label] = [];
    return Lill.each(source, function(item) {
      return target.push(item.inspect());
    });
  };
  toResult('all', this);
  toResult('added', data.added);
  toResult('removed', data.removed);
  return result;
};

mapComponentName = function(componentType) {
  return componentType.typeName;
};

poolNodeItem = function(pool, nodeItem) {
  if (!(nodeItem && pool.length)) {
    return pool.pop();
  }
  nodeItem[symbols.bEntity] = null;
  return pool.push(nodeItem);
};

validateEntity = function(entity) {
  if (!(entity && _.isFunction(entity.get))) {
    throw new TypeError('invalid entity for node type');
  }
  return entity;
};

bValidated = Symbol('validated node type component list');

NodeType.validateComponentTypes = function(types, componentProvider) {
  var failed, lastIdx, validTypes, validateType;
  if (!_.isObject(types)) {
    return new Array(0);
  }
  if (types[bValidated]) {
    return types;
  }
  failed = function(result) {
    result.length -= 1;
    return result;
  };
  lastIdx = 0;
  validateType = function(result, componentType) {
    var providedType;
    if (!componentType) {
      return failed(result);
    }
    if (!(componentType instanceof Component)) {
      if (componentProvider) {
        if (!(providedType = componentProvider(componentType))) {
          log('invalid component type used for node:', componentType);
          return failed(result);
        }
        componentType = providedType;
      } else {
        return failed(result);
      }
    }
    if (result.length && ~result.indexOf(componentType)) {
      log('trying to use duplicate component type for node:' + componentType.typeDefinition);
      return failed(result);
    }
    result[lastIdx] = componentType;
    lastIdx += 1;
    return result;
  };
  if (_.isArray(types)) {
    validTypes = fast.reduce(types, validateType, new Array(types.length));
  } else {
    validTypes = validateType(new Array(1), types);
  }
  validTypes[bValidated] = true;
  return validTypes;
};

module.exports = Object.freeze(NodeType);

},{"./component":2,"./symbols":8,"debug":undefined,"es6":undefined,"fast.js":undefined,"lill":undefined,"lodash":undefined}],6:[function(require,module,exports){
module.exports = Object.freeze([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599, 601, 607, 613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 701, 709, 719, 727, 733, 739, 743, 751, 757, 761, 769, 773, 787, 797, 809, 811, 821, 823, 827, 829, 839, 853, 857, 859, 863, 877, 881, 883, 887, 907, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997, 1009, 1013, 1019, 1021, 1031, 1033, 1039, 1049, 1051, 1061, 1063, 1069, 1087, 1091, 1093, 1097, 1103, 1109, 1117, 1123, 1129, 1151, 1153, 1163, 1171, 1181, 1187, 1193, 1201, 1213, 1217, 1223, 1229, 1231, 1237, 1249, 1259, 1277, 1279, 1283, 1289, 1291, 1297, 1301, 1303, 1307, 1319, 1321, 1327, 1361, 1367, 1373, 1381, 1399, 1409, 1423, 1427, 1429, 1433, 1439, 1447, 1451, 1453, 1459, 1471, 1481, 1483, 1487, 1489, 1493, 1499, 1511, 1523, 1531, 1543, 1549, 1553, 1559, 1567, 1571, 1579, 1583, 1597, 1601, 1607, 1609, 1613, 1619, 1621, 1627, 1637, 1657, 1663, 1667, 1669, 1693, 1697, 1699, 1709, 1721, 1723, 1733, 1741, 1747, 1753, 1759, 1777, 1783, 1787, 1789, 1801, 1811, 1823, 1831, 1847, 1861, 1867, 1871, 1873, 1877, 1879, 1889, 1901, 1907, 1913, 1931, 1933, 1949, 1951, 1973, 1979, 1987, 1993, 1997, 1999, 2003, 2011, 2017, 2027, 2029, 2039, 2053, 2063, 2069, 2081, 2083, 2087, 2089, 2099, 2111, 2113, 2129, 2131, 2137, 2141, 2143, 2153, 2161, 2179, 2203, 2207, 2213, 2221, 2237, 2239, 2243, 2251, 2267, 2269, 2273, 2281, 2287, 2293, 2297, 2309, 2311, 2333, 2339, 2341, 2347, 2351, 2357, 2371, 2377, 2381, 2383, 2389, 2393, 2399, 2411, 2417, 2423, 2437, 2441, 2447, 2459, 2467, 2473, 2477, 2503, 2521, 2531, 2539, 2543, 2549, 2551, 2557, 2579, 2591, 2593, 2609, 2617, 2621, 2633, 2647, 2657, 2659, 2663, 2671, 2677, 2683, 2687, 2689, 2693, 2699, 2707, 2711, 2713, 2719, 2729, 2731, 2741, 2749, 2753, 2767, 2777, 2789, 2791, 2797, 2801, 2803, 2819, 2833, 2837, 2843, 2851, 2857, 2861, 2879, 2887, 2897, 2903, 2909, 2917, 2927, 2939, 2953, 2957, 2963, 2969, 2971, 2999, 3001, 3011, 3019, 3023, 3037, 3041, 3049, 3061, 3067, 3079, 3083, 3089, 3109, 3119, 3121, 3137, 3163, 3167, 3169, 3181, 3187, 3191, 3203, 3209, 3217, 3221, 3229, 3251, 3253, 3257, 3259, 3271, 3299, 3301, 3307, 3313, 3319, 3323, 3329, 3331, 3343, 3347, 3359, 3361, 3371, 3373, 3389, 3391, 3407, 3413, 3433, 3449, 3457, 3461, 3463, 3467, 3469, 3491, 3499, 3511, 3517, 3527, 3529, 3533, 3539, 3541, 3547, 3557, 3559, 3571, 3581, 3583, 3593, 3607, 3613, 3617, 3623, 3631, 3637, 3643, 3659, 3671, 3673, 3677, 3691, 3697, 3701, 3709, 3719, 3727, 3733, 3739, 3761, 3767, 3769, 3779, 3793, 3797, 3803, 3821, 3823, 3833, 3847, 3851, 3853, 3863, 3877, 3881, 3889, 3907, 3911, 3917, 3919, 3923, 3929, 3931, 3943, 3947, 3967, 3989, 4001, 4003, 4007, 4013, 4019, 4021, 4027, 4049, 4051, 4057, 4073, 4079, 4091, 4093, 4099, 4111, 4127, 4129, 4133, 4139, 4153, 4157, 4159, 4177, 4201, 4211, 4217, 4219, 4229, 4231, 4241, 4243, 4253, 4259, 4261, 4271, 4273, 4283, 4289, 4297, 4327, 4337, 4339, 4349, 4357, 4363, 4373, 4391, 4397, 4409, 4421, 4423, 4441, 4447, 4451, 4457, 4463, 4481, 4483, 4493, 4507, 4513, 4517, 4519, 4523, 4547, 4549, 4561, 4567, 4583, 4591, 4597, 4603, 4621, 4637, 4639, 4643, 4649, 4651, 4657, 4663, 4673, 4679, 4691, 4703, 4721, 4723, 4729, 4733, 4751, 4759, 4783, 4787, 4789, 4793, 4799, 4801, 4813, 4817, 4831, 4861, 4871, 4877, 4889, 4903, 4909, 4919, 4931, 4933, 4937, 4943, 4951, 4957, 4967, 4969, 4973, 4987, 4993, 4999, 5003, 5009, 5011, 5021, 5023, 5039, 5051, 5059, 5077, 5081, 5087, 5099, 5101, 5107, 5113, 5119, 5147, 5153, 5167, 5171, 5179, 5189, 5197, 5209, 5227, 5231, 5233, 5237, 5261, 5273, 5279, 5281, 5297, 5303, 5309, 5323, 5333, 5347, 5351, 5381, 5387, 5393, 5399, 5407, 5413, 5417, 5419, 5431, 5437, 5441, 5443, 5449, 5471, 5477, 5479, 5483, 5501, 5503, 5507, 5519, 5521, 5527, 5531, 5557, 5563, 5569, 5573, 5581, 5591, 5623, 5639, 5641, 5647, 5651, 5653, 5657, 5659, 5669, 5683, 5689, 5693, 5701, 5711, 5717, 5737, 5741, 5743, 5749, 5779, 5783, 5791, 5801, 5807, 5813, 5821, 5827, 5839, 5843, 5849, 5851, 5857, 5861, 5867, 5869, 5879, 5881, 5897, 5903, 5923, 5927, 5939, 5953, 5981, 5987, 6007, 6011, 6029, 6037, 6043, 6047, 6053, 6067, 6073, 6079, 6089, 6091, 6101, 6113, 6121, 6131, 6133, 6143, 6151, 6163, 6173, 6197, 6199, 6203, 6211, 6217, 6221, 6229, 6247, 6257, 6263, 6269, 6271, 6277, 6287, 6299, 6301, 6311, 6317, 6323, 6329, 6337, 6343, 6353, 6359, 6361, 6367, 6373, 6379, 6389, 6397, 6421, 6427, 6449, 6451, 6469, 6473, 6481, 6491, 6521, 6529, 6547, 6551, 6553, 6563, 6569, 6571, 6577, 6581, 6599, 6607, 6619, 6637, 6653, 6659, 6661, 6673, 6679, 6689, 6691, 6701, 6703, 6709, 6719, 6733, 6737, 6761, 6763, 6779, 6781, 6791, 6793, 6803, 6823, 6827, 6829, 6833, 6841, 6857, 6863, 6869, 6871, 6883, 6899, 6907, 6911, 6917, 6947, 6949, 6959, 6961, 6967, 6971, 6977, 6983, 6991, 6997, 7001, 7013, 7019, 7027, 7039, 7043, 7057, 7069, 7079, 7103, 7109, 7121, 7127, 7129, 7151, 7159, 7177, 7187, 7193, 7207, 7211, 7213, 7219, 7229, 7237, 7243, 7247, 7253, 7283, 7297, 7307, 7309, 7321, 7331, 7333, 7349, 7351, 7369, 7393, 7411, 7417, 7433, 7451, 7457, 7459, 7477, 7481, 7487, 7489, 7499, 7507, 7517, 7523, 7529, 7537, 7541, 7547, 7549, 7559, 7561, 7573, 7577, 7583, 7589, 7591, 7603, 7607, 7621, 7639, 7643, 7649, 7669, 7673, 7681, 7687, 7691, 7699, 7703, 7717, 7723, 7727, 7741, 7753, 7757, 7759, 7789, 7793, 7817, 7823, 7829, 7841, 7853, 7867, 7873, 7877, 7879, 7883, 7901, 7907, 7919]);

},{}],7:[function(require,module,exports){
exports.Component = require('./component');

exports.Entity = require('./entity');

exports.Node = require('./node');

exports.System = require('./system');

exports.Engine = require('./engine');

exports.Symbols = require('./symbols');

},{"./component":2,"./engine":3,"./entity":4,"./node":5,"./symbols":8,"./system":9}],8:[function(require,module,exports){
'use strict';
var Symbol;

Symbol = require('es6').Symbol;

exports.bName = Symbol('name of the object');

exports.bType = Symbol('type of the object');

exports.bDispose = Symbol('method to dispose object');

exports.bRelease = Symbol('method to release disposed object');

exports.bChanged = Symbol('timestamp of last change');

exports.bDisposing = Symbol('timestamp of the object disposal');

exports.bEntity = Symbol('reference to entity instance');

exports.Symbol = Symbol;

exports.bIdentity = Symbol('identifier of the object');

exports.bFields = Symbol('fields defined for the component');

exports.bDefinition = Symbol('definition of the component');

},{"es6":undefined}],9:[function(require,module,exports){
var _, symbols;

_ = require('lodash');

symbols = require('./symbols');

exports.define = function(name, initializer) {
  if (!_.isString(name)) {
    throw new TypeError('expected name for system');
  }
  if (!_.isFunction(initializer)) {
    throw new TypeError('expected function as system initializer');
  }
  initializer[symbols.bName] = name;
  return Object.freeze(initializer);
};

},{"./symbols":8,"lodash":undefined}]},{},[7])(7)
});