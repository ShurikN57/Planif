// Two-level planning fingerprints: one short hash for the plan without its weeks, one per week.
// They let a failing fingerprint test name the scenario, plan kind and week that changed.
const crypto = require('node:crypto');
const {parisJson} = require('./paris-dates.cjs');
const short = value => crypto.createHash('sha256').update(parisJson(value)).digest('hex').slice(0, 16);
function planSignature(plan) {
  const {weeks, ...rest} = plan;
  return {top: short(rest), weeks: (weeks || []).map(short)};
}
// One line describing a generated week, printed next to a mismatch.
function weekSummary(week) {
  if (!week) return 'semaine absente';
  const parts = [];
  for (const key of ['phase', 'block', 'kind'])
    if (week[key] !== undefined) parts.push(`${key}=${week[key]}`);
  if (week.assim || week.assimilation) parts.push('assimilation');
  for (const key of ['vol', 'target', 'load'])
    if (Number.isFinite(week[key])) parts.push(`${key}=${Math.round(week[key] * 100) / 100}`);
  if (Array.isArray(week.sessions)) parts.push(`qualités=${week.sessions.length}`);
  if (Array.isArray(week.days))
    parts.push(`séances=${week.days.reduce((n, d) => n + (d.items || []).length, 0)}`);
  return parts.join(', ');
}
module.exports = {short, planSignature, weekSummary};
