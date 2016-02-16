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
