global = do Function('return this')
global.IN_TEST = 'test'

require './component.test.coffee'
require './entity.test.coffee'
require './node.test.coffee'
require './action.test.coffee'
require './system.test.coffee'
require './engine.test.coffee'