'use strict'

const secret = {
  handlers: Symbol('attribute handlers')
}

function attributes (elem, state, next) {
  if (elem.nodeType !== 1) return

  elem[secret.handlers] = []
  elem.$attribute = $attribute
  next()

  processAttributesWithoutHandler(elem)
  elem[secret.handlers].forEach(processAttributeWithHandler, elem)
}
attributes.$name = 'attributes'
attributes.$require = ['observe', 'expression']
module.exports = attributes

function $attribute (name, handler) {
  if (typeof name !== 'string') {
    throw new TypeError('first argument must be a string')
  }
  if (typeof handler !== 'function') {
    throw new TypeError('second argument must be a function')
  }

  let value = this.getAttribute(name)
  if (value !== null) {
    this[secret.handlers].push({type: '', value, name, handler})
    return
  }

  const observedName = '@' + name
  value = this.getAttribute(observedName)
  if (value !== null) {
    this[secret.handlers].push({type: '@', value, name, handler})
    this.removeAttribute(observedName)
    return
  }

  const onceName = '$' + name
  value = this.getAttribute(onceName)
  if (value !== null) {
    this[secret.handlers].push({type: '$', value, name, handler})
    this.removeAttribute(onceName)
  }
}

function processAttributesWithoutHandler (elem) {
  const attributes = elem.attributes
  for (let i = attributes.length; i--;) {
    const attribute = attributes[i]
    if (attribute.name[0] === '$') {
      const name = attribute.name.slice(1)
      const expression = elem.$compileExpression(attribute.value || name)
      defaultHandler(elem, name, expression)
      elem.removeAttribute(attribute.name)
    } else if (attribute.name[0] === '@') {
      const name = attribute.name.slice(1)
      const expression = elem.$compileExpression(attribute.value || name)
      elem.$observe(() => defaultHandler(elem, name, expression))
      elem.removeAttribute(attribute.name)
    }
  }
}

function defaultHandler (elem, name, expression) {
  const value = expression(elem.$contextState)
  if (value) {
    elem.setAttribute(name, value)
  } else {
    elem.removeAttribute(name)
  }
}

function processAttributeWithHandler (handler) {
  const contextState = this.$contextState
  if (handler.type === '') {
    handler.handler(handler.value, this)
  } else if (handler.type === '$') {
    const expression = this.$compileExpression(handler.value || handler.name)
    handler.handler(expression(contextState), this)
  } else if (handler.type === '@') {
    const expression = this.$compileExpression(handler.value || handler.name)
    this.$observe(() => handler.handler(expression(contextState), this))
  }
}
