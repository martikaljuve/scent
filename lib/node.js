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
