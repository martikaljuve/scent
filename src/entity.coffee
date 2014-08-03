log = (require 'debug') 'scent:entity'
_ = require 'lodash'

require 'es6-shim'
entities = new Map

module.exports = (id) ->

	if hasId = (arguments.length > 0)
		unless _.isString(id) or _.isNumber(id) 
			throw new TypeError 'invalid id for entity, expected string or number'

	# Return existing entity
	return entity if hasId and entity = entities.get id

	# Fetch entity from the pool or create fresh one
	if entityPool.length
		entity = entityPool.pop()
	else
		entity = Object.create Entity, '__map': value: new Map

	# Handle entity with ID
	if hasId	
		Object.defineProperty entity, 'id', {enumerable: yes, get: -> id}
		entities.set id, entity

	Object.freeze entity
	return entity

entityPool = []

Entity =
	add: (component) ->
		validateComponent component
		if this.__map.has componentType = component.componentType
			log 'entity %s already contains component of type %s, consider using replace method if this is intended', this, componentType
		this.__map.set componentType, component
		return this

	replace: (component) ->
		validateComponent component
		this.__map.set component.componentType, component
		return this

	has: (componentType) ->
		validateComponentType componentType
		return this.__map.has componentType

	get: (componentType) ->
		validateComponentType componentType
		return this.__map.get(componentType) or null

	remove: (componentType, dispose) ->
		validateComponentType componentType
		if false isnt dispose and component = this.__map.get componentType
			component.dispose()
		return this.__map.delete(componentType)

	dispose: ->
		this.__map.forEach disposeComponent
		this.__map.clear()
		if this.id
			entities.delete this.id
			this.id = undefined
		else
			entityPool.push this

disposeComponent = (component) ->
	component.dispose()

validateComponent = (component) ->
	unless component
		throw new TypeError 'missing component for entity'
	validateComponentType component.componentType

validateComponentType = (componentType) ->
	unless _.isObject(componentType) and componentType.hasOwnProperty('componentName')
		throw new TypeError 'invalid component for entity'
	