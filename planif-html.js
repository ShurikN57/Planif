/* PlanifHtml: the single HTML escaping function for every template that inserts non-literal data. */
(function (root) {
  'use strict';
  const ENTITIES = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ENTITIES[c]);
  const api = Object.freeze({escapeHtml});
  root.PlanifHtml = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(globalThis);
