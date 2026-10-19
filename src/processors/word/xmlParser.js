import {
  MAX_XML_ENTRY_SIZE,
  MAX_XML_DEPTH,
  MAX_XML_NODE_COUNT,
  OPENXML_NS,
} from './constants.js';

/**
 * Returns a standard DOMParser instance from the current browser or test environment.
 * @returns {DOMParser}
 */
export function getDOMParser() {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser();
  }
  if (typeof window !== 'undefined' && window.DOMParser) {
    return new window.DOMParser();
  }
  if (typeof globalThis !== 'undefined' && globalThis.DOMParser) {
    return new globalThis.DOMParser();
  }
  throw new Error('DOMParser is not available in the current JavaScript environment.');
}

/**
 * Scans an XML string for dangerous entity declarations before parsing.
 * DOCX specifications (ISO/IEC 29500) strictly disallow DOCTYPE and ENTITY declarations.
 *
 * @param {string} xmlString
 * @throws {Error} If DOCTYPE or ENTITY declarations are detected
 */
export function validateXmlSecurity(xmlString) {
  if (typeof xmlString !== 'string') {
    throw new Error('XML content must be a valid string.');
  }

  if (xmlString.length > MAX_XML_ENTRY_SIZE) {
    throw new Error(
      `XML content exceeds maximum size limit (${(MAX_XML_ENTRY_SIZE / (1024 * 1024)).toFixed(
        0
      )} MB).`
    );
  }

  // Pre-parser gate: Reject any DOCTYPE or ENTITY declarations
  if (/(?:<!DOCTYPE|<!ENTITY)/i.test(xmlString)) {
    throw new Error(
      'Security Error: Forbidden DOCTYPE or ENTITY declaration detected in DOCX XML part.'
    );
  }
}

/**
 * Validates the structural limits (nesting depth and node count) of a parsed XML Document.
 * Defends against deeply nested XML or quadratic node explosion attacks.
 *
 * @param {Document|Element} rootNode
 * @throws {Error} If depth or node limits are exceeded
 */
export function validateXmlStructure(rootNode) {
  let totalNodes = 0;
  let maxDepthObserved = 0;

  function traverse(node, currentDepth) {
    if (currentDepth > maxDepthObserved) {
      maxDepthObserved = currentDepth;
    }

    if (currentDepth > MAX_XML_DEPTH) {
      throw new Error(
        `Security Error: XML document exceeds maximum nesting depth (${MAX_XML_DEPTH} levels).`
      );
    }

    totalNodes++;
    if (totalNodes > MAX_XML_NODE_COUNT) {
      throw new Error(
        `Security Error: XML document contains excessive node count (exceeded ${MAX_XML_NODE_COUNT} nodes).`
      );
    }

    const children = node.children;
    if (children && children.length > 0) {
      for (let i = 0; i < children.length; i++) {
        traverse(children[i], currentDepth + 1);
      }
    }
  }

  const startElement = rootNode.documentElement || rootNode;
  traverse(startElement, 1);
}

/**
 * Safely parses an XML string into a validated DOM Document.
 *
 * @param {string} xmlString - Raw XML content
 * @param {string} [partName='XML Part'] - Name of the archive part for diagnostics
 * @returns {XMLDocument}
 */
export function parseXmlSafely(xmlString, partName = 'XML Part') {
  validateXmlSecurity(xmlString);

  const parser = getDOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');

  // Check for parsererror in standard DOMParser implementations
  const parserError = doc.getElementsByTagName('parsererror')[0];
  if (parserError) {
    const errorText = parserError.textContent || 'Unknown XML parsing error';
    throw new Error(`Malformed XML in "${partName}": ${errorText.trim().slice(0, 200)}`);
  }

  if (!doc.documentElement) {
    throw new Error(`Malformed XML in "${partName}": missing document root element.`);
  }

  // Validate structural depth and node limits
  validateXmlStructure(doc);

  return doc;
}

/**
 * Namespace-aware query helper: finds direct child elements matching a given localName
 * in either the default namespace, the w namespace, or any namespace.
 *
 * @param {Element} parent
 * @param {string} localName
 * @param {string} [namespace=OPENXML_NS.w]
 * @returns {Element[]}
 */
export function getChildElementsByLocalName(parent, localName, namespace = OPENXML_NS.w) {
  if (!parent || !parent.children) return [];
  const results = [];
  const children = parent.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const isMatchingLocal = child.localName === localName || child.nodeName.split(':').pop() === localName;
    const isMatchingNs = !namespace || child.namespaceURI === namespace || !child.namespaceURI;
    if (isMatchingLocal && isMatchingNs) {
      results.push(child);
    }
  }
  return results;
}

/**
 * Namespace-aware query helper: finds the first child element matching a given localName.
 *
 * @param {Element} parent
 * @param {string} localName
 * @param {string} [namespace=OPENXML_NS.w]
 * @returns {Element|null}
 */
export function getFirstChildElementByLocalName(parent, localName, namespace = OPENXML_NS.w) {
  if (!parent || !parent.children) return null;
  const children = parent.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const isMatchingLocal = child.localName === localName || child.nodeName.split(':').pop() === localName;
    const isMatchingNs = !namespace || child.namespaceURI === namespace || !child.namespaceURI;
    if (isMatchingLocal && isMatchingNs) {
      return child;
    }
  }
  return null;
}

/**
 * Safe attribute reader: retrieves an attribute value regardless of prefix variations.
 *
 * @param {Element} element
 * @param {string} attributeLocalName
 * @param {string} [namespace=OPENXML_NS.w]
 * @returns {string|null}
 */
export function getSafeAttribute(element, attributeLocalName, namespace = OPENXML_NS.w) {
  if (!element) return null;

  // Try namespace-aware getAttributeNS
  if (namespace && typeof element.getAttributeNS === 'function') {
    const val = element.getAttributeNS(namespace, attributeLocalName);
    if (val !== null && val !== undefined) return val;
  }

  // Try standard prefixed getAttribute (e.g. w:val, r:id)
  const prefixes = ['w', 'r', 'rel', 'a', 'wp'];
  for (const prefix of prefixes) {
    const prefixedName = `${prefix}:${attributeLocalName}`;
    if (element.hasAttribute && element.hasAttribute(prefixedName)) {
      return element.getAttribute(prefixedName);
    }
  }

  // Fallback to un-prefixed attribute name
  if (element.hasAttribute && element.hasAttribute(attributeLocalName)) {
    return element.getAttribute(attributeLocalName);
  }

  return null;
}
