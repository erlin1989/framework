'use strict'

const secret = {
  template: Symbol('content template'),
  separators: Symbol('content separators')
}
let cloneId = 0

function content (elem) {
  if (elem.nodeType !== 1) return

  elem.$extractContent = $extractContent
  elem.$insertContent = $insertContent
  elem.$removeContent = $removeContent
  elem.$replaceContent = $replaceContent
  elem.$moveContent = $moveContent
  elem.$mutateContext = $mutateContext
}
content.$name = 'content'
module.exports = content

function $extractContent () {
  const template = document.createDocumentFragment()
  let node = this.firstChild
  while (node) {
    processContent(node)
    template.appendChild(node)
    node = this.firstChild
  }
  this[secret.template] = template
  this[secret.separators] = []
  return template
}

function processContent (node) {
  if (node.nodeType === 1) {
    node.setAttribute('clone-id', cloneId++)
    const childNodes = node.childNodes
    for (let i = childNodes.length; i--;) {
      processContent(childNodes[i])
    }
  } else if (node.nodeType === 3 && !node.nodeValue.trim()) {
    node.remove()
  }
}

function $insertContent (index, contextState) {
  index = index || 0
  if (typeof index !== 'number') {
    throw new TypeError('first argument must be a number')
  }
  if (contextState !== undefined && typeof contextState !== 'object') {
    throw new TypeError('second argument must be an object or undefined')
  }
  if (!this[secret.template]) {
    throw new Error('you must extract a template with $extractContent before inserting')
  }
  const content = document.importNode(this[secret.template], true)
  const separator = document.createComment('#separator#')
  content.appendChild(separator)

  if (contextState) {
    contextState = Object.assign(Object.create(this.$state), contextState)

    let node = content.firstChild
    while (node) {
      node.$contextState = contextState
      node = node.nextSibling
    }
  }
  this.insertBefore(content, findContentStartAtIndex(this, index))
  this[secret.separators].splice(index, 0, separator)
}

function $removeContent (index) {
  index = index || 0
  if (typeof index !== 'number') {
    throw new TypeError('first argument must be a number')
  }
  if (!this[secret.template]) {
    throw new Error('you must extract a template with $extractContent before removing')
  }
  let node = findContentStartAtIndex(this, index)
  let next
  while (node && !isSeparator(node)) {
    next = node.nextSibling
    node.remove()
    node = next
  }
  node.remove()
  this[secret.separators].splice(index, 1)
}

function $replaceContent (index, contextState) {
  index = index || 0
  this.$removeContent(index)
  this.$insertContent(index, contextState)
}

function $moveContent (fromIndex, toIndex) {
  fromIndex = fromIndex || 0
  toIndex = toIndex || 0
  if (!this[secret.template]) {
    throw new Error('you must extract a template with $extractContent before removing')
  }
  let fromNode = findContentStartAtIndex(this, fromIndex)

  let toNode = findContentStartAtIndex(this, toIndex)
  let fromNext
  while (fromNode && !isSeparator(fromNode)) {
    fromNext = fromNode.nextSibling
    this.insertBefore(fromNode, toNode)
    fromNode = fromNext
  }
  this.insertBefore(fromNode, toNode)
  const separators = this[secret.separators]
  separators.splice(toIndex, 0, separators.splice(fromIndex, 1)[0])

  if (fromNode) {
    const contextState = fromNode.$contextState
    if (contextState) {
      contextState.$index = toIndex
    }
  }
}

function $mutateContext (index, extraContext) {
  index = index || 0
  if (typeof index !== 'number') {
    throw new TypeError('first argument must be a number')
  }
  if (typeof extraContext !== 'object') {
    throw new TypeError('second argument must be an object')
  }
  const startNode = findContentStartAtIndex(this, index)
  if (startNode) {
    const contextState = startNode.$contextState
    if (contextState) {
      Object.assign(contextState, extraContext)
    }
  }
}

function findContentStartAtIndex (node, index) {
  index--
  const separators = node[secret.separators]
  if (index < 0) {
    return node.firstChild
  }
  if (separators[index]) {
    return separators[index].nextSibling
  }
}

function isSeparator (node) {
  return (node.nodeType === Node.COMMENT_NODE && node.nodeValue === '#separator#')
}
