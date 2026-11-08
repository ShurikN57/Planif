/* PlanifHtml: the single HTML escaping function for every template that inserts non-literal data,
   and the application of computed styles without inline style attributes. */
(function (root) {
  'use strict';
  const ENTITIES = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ENTITIES[c]);

  // The CSP refuses inline style attributes. Templates write computed values as data attributes
  // and they are applied through the CSSOM, which the CSP allows:
  //   data-css-c  → custom property --c (phase or zone colour)
  //   data-css-w  → width in %
  //   data-css-bg → background
  const DATA_STYLES = [
    ['cssC', (el, value) => el.style.setProperty('--c', value)],
    ['cssW', (el, value) => (el.style.width = `${value}%`)],
    ['cssBg', (el, value) => (el.style.background = value)]
  ];
  const DATA_STYLE_SELECTOR = '[data-css-c],[data-css-w],[data-css-bg]';
  function applyDataStyles(node) {
    if (!node || node.nodeType !== 1) return;
    const elements = node.matches(DATA_STYLE_SELECTOR) ? [node] : [];
    elements.push(...node.querySelectorAll(DATA_STYLE_SELECTOR));
    for (const el of elements)
      for (const [key, apply] of DATA_STYLES) if (el.dataset[key] !== undefined) apply(el, el.dataset[key]);
  }
  // Applies the data styles to the document and to every element added later. Mutation observer
  // callbacks run before the next paint, so the styles are never visible without their values.
  function observeDataStyles(doc) {
    applyDataStyles(doc.documentElement);
    new doc.defaultView.MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) applyDataStyles(node);
    }).observe(doc.documentElement, {childList: true, subtree: true});
  }

  const api = Object.freeze({escapeHtml, applyDataStyles, observeDataStyles});
  root.PlanifHtml = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(globalThis);
