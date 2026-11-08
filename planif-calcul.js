/* PlanifCalcul: tools of the Calcul tab (chrono, endurance, critical speed, load calculator,
   heart-rate panel) and the weekly volume/charge summary. Moved unchanged from planif-ui.js; the
   interface injects its dependencies. The tools never write plans or athlete references. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlanifCalcul = factory();
})(globalThis, function () {
  function create(deps) {
    const {
      $,
      ZONES,
      fmtPace,
      fmtDur,
      referenceErrors,
      predict,
      lt1Ref,
      efBand,
      loadPersonalModel,
      programLoadFactor,
      RULES,
      readState,
      capacityAdvice,
      zoneBar,
      escapeHtml,
      fText,
      renderApp,
      currentTab
    } = deps;
    // Capacity message (decision 0008); the last result is reused while the inputs and plan are unchanged.
    let capacityCache = {};
    function capacityHtml(st, C) {
      if (capacityCache.st === st && capacityCache.plan === C) return capacityCache.html;
      const advice = capacityAdvice(st, C);
      const html = advice
        ? `<p class="lbl capacityAdvice" data-volume-capacity role="status">Sur les semaines de charge, Planif estime le volume atteignable à environ ${fmtDur(Math.floor(advice.capacity / 5) * 5)} par semaine, pour une cible moyenne de ${fmtDur(Math.round(advice.target / 5) * 5)}. ${advice.extraRun ? 'Réduis la cible ou ajoute une sortie si ton planning le permet.' : 'Réduis la cible.'}</p>`
        : '';
      capacityCache = {st, plan: C, html};
      return html;
    }
    function volumeChargeHtml(st, C) {
      let h = '';
      const valid = referenceErrors(st).length === 0;
      if (valid && Number.isFinite(st.vol) && st.vol > 0 && C && C.weeks) {
        const vols = C.weeks.map(w => w.vol),
          mx = Math.max(...vols),
          avg = vols.reduce((a, x) => a + x, 0) / vols.length;
        h +=
          `<section class="calVolume" aria-label="Volume et charge"><h3>Volume et charge</h3><div class="kv u-mb7"><span>Cible moyenne du plan</span><span class="v">${fmtDur(st.vol)}</span><span>Moyenne planifiée</span><span class="v">${fmtDur(avg)}</span></div>${capacityHtml(st, C)}<div class="vbars">` +
          C.weeks
            .map(
              (w, i) =>
                `<div class="vbar"><span>S${i + 1}</span>${zoneBar(w.z, w.vol, (w.vol / mx) * 100)}<span class="v">${fmtDur(w.vol)}</span></div>`
            )
            .join('') +
          '</div><div class="legend">' +
          Object.values(ZONES)
            .map(z => `<span data-css-c="${z.c}">${z.lab}</span>`)
            .join('') +
          '</div></section>';
      }
      return h;
    }

    const CHRONO_DISTANCES = {
      fractions: [
        ['100', '100 m'],
        ['200', '200 m'],
        ['300', '300 m'],
        ['400', '400 m'],
        ['500', '500 m'],
        ['600', '600 m'],
        ['800', '800 m'],
        ['1200', '1200 m'],
        ['1600', '1600 m'],
        ['2000', '2000 m']
      ],
      official: [
        ['1500', '1500 m'],
        ['1609.344', 'Mile'],
        ['3000', '3000 m'],
        ['5000', '5000 m'],
        ['10000', '10 km'],
        ['21097.5', 'Semi-marathon'],
        ['42195', 'Marathon']
      ]
    };
    const chronoState = {
      category: 'fractions',
      distance: '400',
      free: '7,5',
      pace: '4:00',
      time: '40:00',
      mode: 'pace'
    };
    const enduranceState = {
      distance: '10000',
      time: '41:00',
      vma: '',
      references: [
        {distance: '5000', scope: 'endurance2', active: false},
        {distance: '21097.5', scope: 'endurance3', active: false},
        {distance: '42195', scope: 'endurance4', active: false}
      ]
    };
    function chronoSeconds(raw) {
      const m = /^(\d+)[:'’](\d{2})$/.exec(String(raw).trim());
      return m && +m[2] < 60 && +m[1] * 60 + +m[2] > 0 ? +m[1] * 60 + +m[2] : NaN;
    }
    function chronoTime(seconds, hundredths = false) {
      if (!Number.isFinite(seconds) || seconds <= 0) return '—';
      const cs = Math.round(seconds * 100);
      if (hundredths && cs < 6000) return Math.floor(cs / 100) + '″' + String(cs % 100).padStart(2, '0');
      const n = Math.round(seconds),
        h = Math.floor(n / 3600),
        m = Math.floor((n % 3600) / 60),
        sec = n % 60;
      return (h ? h + 'h ' : '') + (h ? String(m).padStart(2, '0') : m) + '’' + String(sec).padStart(2, '0');
    }
    function chronoMeters() {
      return chronoState.category === 'free'
        ? Number(chronoState.free.replace(',', '.')) * 1000
        : Number(chronoState.distance);
    }
    function chronoTargetHtml() {
      const meters = chronoMeters();
      return Number.isFinite(meters) && meters > 0 && meters <= 1000000
        ? wheelPicker('chrono', String(meters), meters, '')
        : '<span class="lbl">Renseigne une distance valide.</span>';
    }
    function refreshChronoTarget() {
      const target = $('scr-calc').querySelector('[data-chrono-target]');
      if (target) target.innerHTML = chronoTargetHtml();
    }
    function toolAttr(value) {
      return escapeHtml(value);
    }

    const wheelSaved = {
      chrono: {},
      endurance: {},
      endurance2: {},
      endurance3: {},
      endurance4: {},
      critical: {}
    };
    function wheelSeconds(scope, key, meters, initial) {
      const k = String(key);
      if (!Object.prototype.hasOwnProperty.call(wheelSaved[scope], k)) {
        const t = initial ? enduranceSeconds(initial) : NaN;
        wheelSaved[scope][k] =
          Number.isFinite(t) && t > 0 ? t : meters === 21097.5 ? 3600 : meters === 42195 ? 7200 : 0;
      }
      return wheelSaved[scope][k];
    }
    function wheelPicker(scope, key, meters, initial) {
      const t = wheelSeconds(scope, key, meters, initial),
        cs = Math.round(t * 100),
        short = meters > 200 && meters <= 5000;
      const values = {
        h: Math.floor(cs / 360000),
        m: Math.floor((short ? cs : cs % 360000) / 6000),
        s: Math.floor((cs % 6000) / 100),
        c: cs % 100
      };
      const units = meters <= 200 ? ['s', 'c'] : short ? ['m', 's'] : ['h', 'm', 's'];
      return (
        '<div class="timeWheel simWheel" data-wheel-scope="' +
        scope +
        '" data-wheel-key="' +
        key +
        '" data-wheel-meters="' +
        meters +
        '">' +
        units
          .map(u => {
            const max = u === 'h' ? 23 : u === 'c' || (u === 'm' && short) ? 99 : 59;
            return (
              '<label>' +
              {h: 'h', m: 'min', s: 'sec', c: 'cent.'}[u] +
              '<select data-wheel-unit-input="' +
              u +
              '" aria-label="' +
              {h: 'Heures', m: 'Minutes', s: 'Secondes', c: 'Centièmes'}[u] +
              '">' +
              Array.from(
                {length: max + 1},
                (_, i) =>
                  '<option value="' +
                  i +
                  '"' +
                  (i === values[u] ? ' selected' : '') +
                  '>' +
                  String(i).padStart(2, '0') +
                  '</option>'
              ).join('') +
              '</select></label>'
            );
          })
          .join('') +
        '</div>'
      );
    }
    function wheelSet(box, unit, value) {
      const scope = box.dataset.wheelScope,
        key = box.dataset.wheelKey,
        meters = Number(box.dataset.wheelMeters),
        short = meters > 200 && meters <= 5000,
        max = unit === 'h' ? 23 : unit === 'c' || (unit === 'm' && short) ? 99 : 59,
        n = Number(value);
      if (!Number.isInteger(n) || n < 0 || n > max) return;
      const cs = Math.round(wheelSeconds(scope, key, meters) * 100),
        p = {
          h: meters > 5000 ? Math.floor(cs / 360000) : 0,
          m: meters <= 200 ? 0 : Math.floor((short ? cs : cs % 360000) / 6000),
          s: Math.floor((cs % 6000) / 100),
          c: meters <= 200 ? cs % 100 : 0
        };
      p[unit] = n;
      wheelSaved[scope][key] = p.h * 3600 + p.m * 60 + p.s + p.c / 100;
      box.querySelectorAll('[data-wheel-unit-input]').forEach(select => {
        select.value = String(p[select.dataset.wheelUnitInput]);
      });
      updateToolsUi();
    }
    function chronoToolHtml() {
      const c = chronoState;
      const options = CHRONO_DISTANCES[c.category] || [];
      const reverse = c.mode === 'time';
      return `<div class="card chronoPanel" data-chrono-tool><h2 class="calcTitle"><span class="calcIcon calcIcon-chrono" aria-hidden="true"><svg viewBox="0 0 90 90" aria-hidden="true"><path d="M9 38h13M5 48h15M10 58h12" stroke="#a398d9" stroke-width="4" stroke-linecap="round"/><path d="M39 9h20M49 9v11" stroke="#7167ba" stroke-width="5" stroke-linecap="round"/><circle cx="49" cy="51" r="30" fill="none" stroke="#766bc1" stroke-width="4"/><path d="M49 51V31m0 20 12 8" stroke="#8176c8" stroke-width="4" fill="none" stroke-linecap="round"/></svg></span>Chrono</h2><div class="optSeg" role="group" aria-label="Sens du calcul"><button type="button" data-chrono-mode="pace" aria-pressed="${!reverse}">Allure</button><button type="button" data-chrono-mode="time" aria-pressed="${reverse}">Temps</button></div><div class="sf2"><label class="sf"><span>Distance</span><select data-chrono-category><option value="fractions"${c.category === 'fractions' ? ' selected' : ''}>Fractions</option><option value="official"${c.category === 'official' ? ' selected' : ''}>Officielles</option><option value="free"${c.category === 'free' ? ' selected' : ''}>Libre</option></select></label><label class="sf"><span>${c.category === 'free' ? 'Distance (km)' : 'Distance'}</span>${c.category === 'free' ? `<input data-chrono-free inputmode="decimal" value="${toolAttr(c.free)}">` : `<select data-chrono-distance>${options.map(([v, l]) => `<option value="${v}"${v === c.distance ? ' selected' : ''}>${l}</option>`).join('')}</select>`}</label></div><div class="sf2 calcResultRow">${reverse ? `<div class="sf"><div data-chrono-target>${chronoTargetHtml()}</div></div>` : `<label class="sf"><span>Allure (min/km)</span><input data-chrono-pace inputmode="text" placeholder="4:00" value="${toolAttr(c.pace)}"></label>`}<div class="conversionResult"><span>${reverse ? 'Allure nécessaire' : 'Temps estimé'}</span><strong data-chrono-output role="status">—</strong><span class="lbl" data-chrono-speed></span></div></div><button type="button" class="cta ghost" data-chrono-to-endurance>Utiliser ce chrono pour l’indice d’endurance</button></div>`;
    }
    const ENDURANCE_DISTANCES = [
      ['5000', '5 km'],
      ['10000', '10 km'],
      ['21097.5', 'Semi-marathon'],
      ['42195', 'Marathon']
    ];
    function enduranceDistanceOptions(distance) {
      return ENDURANCE_DISTANCES.map(
        ([v, l]) => `<option value="${v}"${distance === v ? ' selected' : ''}>${l}</option>`
      ).join('');
    }
    function enduranceReference(reference = null) {
      const e = enduranceState,
        distance = reference ? reference.distance : e.distance,
        meters = Number(distance),
        secs = wheelSeconds(reference ? reference.scope : 'endurance', distance, meters),
        v = Number((e.vma || String(readState().vma)).replace(',', '.')),
        pct = (((meters / secs) * 3.6) / v) * 100,
        ie = (pct - 100) / Math.log(secs / 360);
      return {
        distance,
        secs,
        ie: v > 0 && Number.isFinite(secs) && secs > 360 && Number.isFinite(ie) ? ie : null
      };
    }
    function enduranceIndexText(r) {
      return r.ie === null ? '—' : r.ie.toFixed(2).replace('.', ',');
    }
    function enduranceResultsHtml() {
      return [null, ...enduranceState.references.filter(r => r.active)]
        .map(reference => {
          const r = enduranceReference(reference),
            label = ENDURANCE_DISTANCES.find(([v]) => v === r.distance)?.[1] || '—';
          return `<span>${label} · ${chronoTime(r.secs)}</span><span class="v">IE : ${enduranceIndexText(r)}</span>`;
        })
        .join('');
    }
    function enduranceExtraHtml() {
      let number = 1;
      return enduranceState.references
        .map((r, i) =>
          r.active
            ? `<div class="simSecond"><div class="settingsTitle"><b>${['Deuxième', 'Troisième', 'Quatrième'][number++ - 1]} chrono</b><button type="button" class="ghost" data-ie-remove="${i}">Supprimer</button></div><div class="sf2 calcResultRow"><label class="sf"><span>Performance</span><select data-ie-extra-distance="${i}">${enduranceDistanceOptions(r.distance)}</select></label><div class="sf">${wheelPicker(r.scope, r.distance, Number(r.distance), '')}</div></div></div>`
            : ''
        )
        .join('');
    }
    function updateEnduranceUi(root) {
      const e = root.querySelector('[data-endurance-tool]');
      if (!e) return;
      const output = e.querySelector('[data-ie-output]'),
        comparison = e.querySelector('[data-ie-comparison]');
      if (output) output.textContent = enduranceIndexText(enduranceReference());
      if (comparison) comparison.innerHTML = enduranceResultsHtml();
    }
    function enduranceToolHtml() {
      const e = enduranceState,
        hasExtra = e.references.some(r => r.active),
        canAdd = e.references.some(r => !r.active);
      return `<div class="card chronoPanel" data-endurance-tool><h2 class="calcTitle"><span class="calcIcon calcIcon-endurance" aria-hidden="true"><svg viewBox="0 0 90 90" aria-hidden="true"><path d="M10 8v70h72" stroke="#897bce" stroke-width="4" fill="none" stroke-linecap="round"/><path d="m18 64 18-22 18 8 19-28" stroke="#8577c8" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><g fill="#897bce"><circle cx="36" cy="42" r="6"/><circle cx="54" cy="50" r="6"/><circle cx="73" cy="22" r="6"/></g></svg></span>Indice d’endurance</h2><div class="sf2"><label class="sf"><span>VMA (km/h)</span><input data-ie-vma inputmode="decimal" value="${toolAttr(e.vma)}"></label><label class="sf"><span>Performance</span><select data-ie-distance>${enduranceDistanceOptions(e.distance)}</select></label></div>${hasExtra ? `<div class="sf">${wheelPicker('endurance', e.distance, Number(e.distance), '')}</div>${enduranceExtraHtml()}<div class="kv" data-ie-comparison role="status" aria-live="polite">${enduranceResultsHtml()}</div>` : `<div class="sf2 calcResultRow"><div class="sf">${wheelPicker('endurance', e.distance, Number(e.distance), '')}</div><div class="conversionResult"><span>Indice d’endurance</span><strong data-ie-output role="status">—</strong></div></div>`}${canAdd ? '<button type="button" class="addRef" data-ie-add>+ Ajouter un autre chrono de référence</button>' : ''}</div>`;
    }

    const criticalState = {
      mode: 'free',
      count: 2,
      free: [
        {d: '900', t: '3:00'},
        {d: '1650', t: '6:00'},
        {d: '3050', t: '12:00'}
      ],
      fixed: ['900', '3050']
    };
    function criticalToolHtml() {
      const c = criticalState,
        fixed = c.mode === 'fixed';
      return `<div class="card chronoPanel" data-critical-tool><h2 class="calcTitle"><span class="calcIcon calcIcon-critical" aria-hidden="true"><svg viewBox="0 0 90 90" aria-hidden="true"><path d="M19 61c9-4 17-12 23-23l8-18c2-4 6-5 9-2l16 16c4 4 3 9-1 13L45 75c-4 4-9 6-15 6H15c-6 0-9-5-6-10l10-10Z" fill="#f9f8ff" stroke="#756bc0" stroke-width="4" stroke-linejoin="round"/><path d="m48 25 14 14M40 38l9 7m-14 0 9 7m-15 0 9 7M15 72h29c4 0 7-1 10-4l18-18" fill="none" stroke="#8f83cd" stroke-width="3" stroke-linecap="round"/><path d="M5 47h18M3 55h15M7 63h10" stroke="#9e92dc" stroke-width="4" stroke-linecap="round"/></svg></span>Vitesse critique</h2><div class="optSeg" role="group" aria-label="Protocole de vitesse critique"><button type="button" data-critical-mode="free" aria-pressed="${!fixed}">Libre</button><button type="button" data-critical-mode="fixed" aria-pressed="${fixed}">3’ / 12’</button></div>${
        fixed
          ? `<div class="sf2">` +
            [180, 720]
              .map(
                (t, i) =>
                  `<label class="sf"><span>Distance en ${t / 60} min (m)</span><input data-critical-fixed="${i}" inputmode="decimal" value="${toolAttr(c.fixed[i])}" placeholder="Distance en mètres"></label>`
              )
              .join('') +
            `</div>`
          : `<label class="sf"><span>Nombre de tests</span><select data-critical-count><option value="2"${c.count === 2 ? ' selected' : ''}>2 tests</option><option value="3"${c.count === 3 ? ' selected' : ''}>3 tests</option></select></label>` +
            c.free
              .slice(0, c.count)
              .map(
                (v, i) =>
                  `<div class="sf2"><label class="sf"><span>Test ${i + 1} · distance (m)</span><input data-critical-distance="${i}" inputmode="decimal" value="${toolAttr(v.d)}"></label><div class="sf">${wheelPicker('critical', String(i), 5000, v.t)}</div></div>`
              )
              .join('')
      }<div class="sf2 calcResultRow"><div class="conversionResult"><span>Vitesse critique</span><strong data-critical-pace role="status">—</strong><span class="lbl" data-critical-vc>—</span></div><div class="conversionResult"><span>D′ (réserve de distance)</span><strong data-critical-dprime role="status">—</strong></div></div></div>`;
    }
    function criticalCalculate() {
      const c = criticalState,
        parseDistance = x => Number(String(x).trim().replace(',', '.'));
      const p =
        c.mode === 'fixed'
          ? c.fixed.map((d, i) => ({d: parseDistance(d), t: i === 0 ? 180 : 720}))
          : c.free.slice(0, c.count).map(x => ({
              d: parseDistance(x.d),
              t: wheelSeconds('critical', String(c.free.indexOf(x)), 5000, x.t)
            }));
      if (
        p.some(x => !Number.isFinite(x.d) || x.d <= 0 || !Number.isFinite(x.t) || x.t <= 0) ||
        new Set(p.map(x => x.t)).size !== p.length
      )
        return null;
      const mt = p.reduce((a, x) => a + x.t, 0) / p.length,
        md = p.reduce((a, x) => a + x.d, 0) / p.length,
        den = p.reduce((a, x) => a + (x.t - mt) ** 2, 0);
      if (den <= 0) return null;
      const vc = p.reduce((a, x) => a + (x.t - mt) * (x.d - md), 0) / den,
        dp = md - vc * mt;
      return vc > 0 && dp > 0 && Number.isFinite(vc) && Number.isFinite(dp) ? {vc, dp} : null;
    }
    function updateCriticalUi() {
      const t = $('scr-calc').querySelector('[data-critical-tool]');
      if (!t) return;
      const r = criticalCalculate();
      t.querySelector('[data-critical-vc]').textContent = r
        ? (r.vc * 3.6).toFixed(2).replace('.', ',') + ' km/h'
        : '—';
      t.querySelector('[data-critical-pace]').textContent = r ? chronoTime(1000 / r.vc) + ' /km' : '—';
      t.querySelector('[data-critical-dprime]').textContent = r ? Math.round(r.dp) + ' m' : '—';
    }
    function enduranceSeconds(value) {
      const parts = String(value).trim().split(':');
      if ((parts.length !== 2 && parts.length !== 3) || parts.some(x => !/^\d+$/.test(x))) return NaN;
      const p = parts.map(Number);
      if ((parts.length === 2 && p[1] >= 60) || (parts.length === 3 && (p[1] >= 60 || p[2] >= 60)))
        return NaN;
      return parts.length === 2 ? p[0] * 60 + p[1] : p[0] * 3600 + p[1] * 60 + p[2];
    }
    function updateToolsUi() {
      updateCriticalUi();
      const root = $('scr-calc');
      const t = root.querySelector('[data-chrono-tool]');
      if (t) {
        const meters = chronoMeters(),
          reverse = chronoState.mode === 'time',
          pace = reverse ? NaN : chronoSeconds(chronoState.pace),
          secs = reverse ? wheelSeconds('chrono', String(meters), meters) : (meters * pace) / 1000;
        const valid =
          Number.isFinite(meters) && meters > 0 && meters <= 1000000 && Number.isFinite(secs) && secs > 0;
        const paceSeconds = valid ? (secs * 1000) / meters : NaN;
        t.querySelector('[data-chrono-output]').textContent = valid
          ? reverse
            ? chronoTime(paceSeconds) + ' /km'
            : chronoTime(secs, true)
          : '—';
        t.querySelector('[data-chrono-speed]').textContent =
          valid && reverse ? (3600 / paceSeconds).toFixed(2).replace('.', ',') + ' km/h' : '';
        t.querySelector('[data-chrono-to-endurance]').disabled =
          !valid || !['5000', '10000', '21097.5', '42195'].includes(String(meters));
      }
      updateEnduranceUi(root);
    }
    $('scr-calc').addEventListener('input', e => {
      if (e.target.matches('[data-wheel-unit-input]')) {
        wheelSet(e.target.closest('[data-wheel-scope]'), e.target.dataset.wheelUnitInput, e.target.value);
        return;
      }
      const d = e.target.dataset;
      if (d.chronoPace !== undefined) chronoState.pace = e.target.value;
      else if (d.chronoTime !== undefined) chronoState.time = e.target.value;
      else if (d.chronoFree !== undefined) {
        chronoState.free = e.target.value;
        refreshChronoTarget();
      } else if (d.ieVma !== undefined) enduranceState.vma = e.target.value;
      else if (d.ieTime !== undefined) enduranceState.time = e.target.value;
      else if (d.criticalFixed !== undefined) criticalState.fixed[Number(d.criticalFixed)] = e.target.value;
      else if (d.criticalDistance !== undefined)
        criticalState.free[Number(d.criticalDistance)].d = e.target.value;
      else if (d.criticalTime !== undefined) criticalState.free[Number(d.criticalTime)].t = e.target.value;
      else return;
      updateToolsUi();
    });
    $('scr-calc').addEventListener('change', e => {
      const d = e.target.dataset;
      if (d.wheelUnitInput !== undefined) {
        wheelSet(e.target.closest('[data-wheel-scope]'), d.wheelUnitInput, e.target.value);
        return;
      }
      if (d.chronoCategory !== undefined) {
        chronoState.category = e.target.value;
        chronoState.distance = e.target.value === 'official' ? '5000' : '400';
        renderApp();
      } else if (d.chronoDistance !== undefined) {
        chronoState.distance = e.target.value;
        renderApp();
      } else if (d.ieDistance !== undefined) {
        enduranceState.distance = e.target.value;
        renderApp();
      } else if (d.ieExtraDistance !== undefined) {
        const r = enduranceState.references[Number(d.ieExtraDistance)];
        if (r) r.distance = e.target.value;
        renderApp();
      } else if (d.criticalCount !== undefined) {
        criticalState.count = Number(e.target.value);
        renderApp();
      }
    });
    $('scr-calc').addEventListener('click', e => {
      if (e.target.closest('[data-ie-add]')) {
        const r = enduranceState.references.find(r => !r.active);
        if (r) {
          const used = [
            enduranceState.distance,
            ...enduranceState.references.filter(r => r.active).map(r => r.distance)
          ];
          if (used.includes(r.distance))
            r.distance = ENDURANCE_DISTANCES.find(([d]) => !used.includes(d))?.[0] || r.distance;
          r.active = true;
        }
        renderApp();
        return;
      }
      const removeIe = e.target.closest('[data-ie-remove]');
      if (removeIe) {
        const r = enduranceState.references[Number(removeIe.dataset.ieRemove)];
        if (r) r.active = false;
        renderApp();
        return;
      }
      const criticalButton = e.target.closest('[data-critical-mode]');
      if (criticalButton) {
        criticalState.mode = criticalButton.dataset.criticalMode;
        renderApp();
        return;
      }
      const modeButton = e.target.closest('[data-chrono-mode]');
      if (modeButton) {
        chronoState.mode = modeButton.dataset.chronoMode;
        renderApp();
        return;
      }
      if (!e.target.closest('[data-chrono-to-endurance]')) return;
      const meters = chronoMeters(),
        secs =
          chronoState.mode === 'time'
            ? wheelSeconds('chrono', String(meters), meters)
            : (meters * chronoSeconds(chronoState.pace)) / 1000;
      if (!['5000', '10000', '21097.5', '42195'].includes(String(meters)) || !Number.isFinite(secs)) return;
      enduranceState.distance = String(meters);
      {
        const n = Math.round(secs),
          hh = Math.floor(n / 3600),
          mm = Math.floor((n % 3600) / 60),
          ss = n % 60;
        enduranceState.time = hh
          ? `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
          : `${mm}:${String(ss).padStart(2, '0')}`;
        wheelSaved.endurance[String(meters)] = n;
      }
      renderApp();
    });

    // Independent scratch calculator: never writes to plans or athlete references.
    const LOAD_PRESETS = [
      ['jogg', 'Jogg’'],
      ['ea', 'EA'],
      ['s1', 'Seuil 1'],
      ['s2', 'Seuil 2'],
      ['as42', 'AS42'],
      ['as21', 'AS21'],
      ['as10', 'AS10'],
      ['as5', 'AS5'],
      ['vma100', '100 % VMA'],
      ['vma105', '105 % VMA'],
      ['vma110', '110 % VMA'],
      ['manual', 'Allure manuelle']
    ];
    const loadToolState = {blocks: [{minutes: '30', pace: 'jogg', manual: '5:00', unit: 'pace'}]};
    const loadCurveState = {selected: 's2'};
    function loadCurveChart(model, kind, width) {
      if (!model) return '';
      const duration = kind === 'duration',
        points = model.points.filter(p => !duration || p.time !== null),
        w = Math.max(280, width || 560),
        h = 260,
        L = 48,
        R = 16,
        T = 20,
        B = 48;
      const xs = points.map(p => (duration ? p.time : (p.speed / model.vma) * 100)),
        ys = points.map(p => (duration ? (p.speed / model.vma) * 100 : p.factor)).filter(Number.isFinite);
      const xmin = duration ? Math.min(6, ...xs) : Math.floor(Math.min(...xs) / 10) * 10,
        xmax = duration ? Math.max(240, ...xs) : Math.max(110, Math.ceil(Math.max(...xs) / 10) * 10),
        ymin = duration ? Math.floor(Math.min(...ys) / 10) * 10 : 0,
        ymax = duration ? Math.ceil(Math.max(...ys) / 10) * 10 : Math.max(1.6, ...ys);
      const X = x =>
          L +
          (duration ? Math.log(x / xmin) / Math.log(xmax / xmin) : (x - xmin) / (xmax - xmin)) * (w - L - R),
        Y = y => h - B - ((y - ymin) / (ymax - ymin)) * (h - T - B);
      const tx = duration
          ? [6, 30, 60, 240]
          : [xmin, 80, 100, 110].filter((v, i, a) => v >= xmin && a.indexOf(v) === i),
        ty = duration ? [ymin, (ymin + ymax) / 2, ymax] : [0, 0.6, 1, 1.5];
      const grid =
        tx
          .map(
            v =>
              `<path d="M${X(v)} ${T}V${h - B}"/><text x="${X(v)}" y="${h - B + 18}" text-anchor="${v === xmax ? 'end' : 'middle'}">${v}</text>`
          )
          .join('') +
        ty
          .map(
            v =>
              `<path d="M${L} ${Y(v)}H${w - R}"/><text x="${L - 7}" y="${Y(v) + 4}" text-anchor="end">${String(Math.round(v * 100) / 100).replace('.', ',')}</text>`
          )
          .join('');
      const line = duration
        ? model.points.filter(p => ['s1', 's2', 'vma100'].includes(p.key)).sort((a, b) => a.time - b.time)
        : model.curve;
      const path = line
        .map(
          (p, i) =>
            `${i ? 'L' : 'M'}${X(duration ? p.time : (p.speed / model.vma) * 100)} ${Y(duration ? (p.speed / model.vma) * 100 : p.factor)}`
        )
        .join(' ');
      const marks = points
        .filter(p => duration || p.factor !== null)
        .map(
          p =>
            `<${p.race ? 'circle' : 'rect'} ${p.race ? `cx="${X(duration ? p.time : (p.speed / model.vma) * 100)}" cy="${Y(duration ? (p.speed / model.vma) * 100 : p.factor)}" r="${p.key === loadCurveState.selected ? 6 : 4}"` : `x="${X(duration ? p.time : (p.speed / model.vma) * 100) - 4}" y="${Y(duration ? (p.speed / model.vma) * 100 : p.factor) - 4}" width="8" height="8"`} class="${p.race ? 'loadRaceMark' : 'loadAnchorMark'}"><title>${p.label}</title></${p.race ? 'circle' : 'rect'}>`
        )
        .join('');
      return `<svg class="loadCurveSvg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${duration ? 'Allure en pourcentage de VMA selon la durée de maintien, échelle logarithmique' : 'Coefficient personnalisé selon le pourcentage de VMA'}"><g class="loadChartGrid">${grid}</g><path class="loadChartLine" d="${path}"/>${marks}${points
        .filter(p => p.key === loadCurveState.selected && (duration || p.factor !== null))
        .map(
          p =>
            `<circle class="loadSelectedMark" cx="${X(duration ? p.time : (p.speed / model.vma) * 100)}" cy="${Y(duration ? (p.speed / model.vma) * 100 : p.factor)}" r="9"/><text x="${Math.min(w - R - 36, Math.max(L + 18, X(duration ? p.time : (p.speed / model.vma) * 100)))}" y="${Math.min(h - B - 8, Math.max(T + 16, Y(duration ? (p.speed / model.vma) * 100 : p.factor) - 14))}" text-anchor="middle">${p.label}</text>`
        )
        .join(
          ''
        )}<text x="${L}" y="13">${duration ? 'Allure (% VMA)' : 'Coefficient (point/min)'}</text><text x="${(L + w - R) / 2}" y="${h - 5}" text-anchor="middle">${duration ? 'Maintien (min) · échelle logarithmique' : 'Allure (% VMA)'}</text></svg>`;
    }
    function loadCurveHtml(model, width) {
      if (!model) return '<p class="lbl">Renseigne tes repères pour afficher les courbes.</p>';
      const points = model.points.map(p => ({
        ...p,
        factor: programLoadFactor(p.speed, model.referenceState, model)
      }));
      model = {
        ...model,
        points,
        curve: (model.conflicts.length ? points.filter(p => !p.race) : points).sort(
          (a, b) => a.speed - b.speed
        )
      };
      const selected = model.points.find(p => p.key === loadCurveState.selected) || model.points[0];
      return `<h3>Allure et durée de maintien</h3>${loadCurveChart(model, 'duration', width)}<h3>Coefficient de charge personnalisé</h3>${loadCurveChart(model, 'factor', width)}<p class="lbl">Carrés : hypothèses fixes · ronds : chronos estimés.</p><div class="loadCurveChoices" role="group" aria-label="Repère à examiner">${model.points.map(p => `<button type="button" class="ghost" data-load-point="${p.key}" aria-pressed="${p.key === selected.key}">${p.label}</button>`).join('')}</div><p class="lbl" role="status">${selected.label} · ${fmtPace(selected.speed)}/km · ${((selected.speed / model.vma) * 100).toFixed(1).replace('.', ',')} % VMA · ${selected.time === null ? 'maintien non défini' : loadToolNumber(selected.time) + ' min de maintien'} · ${selected.factor === null ? 'coefficient hors modèle' : 'coefficient ' + selected.factor.toFixed(2).replace('.', ',')}</p>${model.issues.map(s => `<p class="lbl" role="alert">${s}</p>`).join('')}<details><summary>Valeurs de tous les repères</summary><div class="loadCurveTable"><table><thead><tr><th>Allure</th><th>min/km</th><th>Maintien (min)</th><th>Coeff.</th></tr></thead><tbody>${model.points.map(p => `<tr><th>${p.label}</th><td>${fmtPace(p.speed)}</td><td>${p.time === null ? '—' : loadToolNumber(p.time)}</td><td>${p.factor === null ? '—' : p.factor.toFixed(2).replace('.', ',')}</td></tr>`).join('')}</tbody></table></div></details>`;
    }
    function loadToolReferences() {
      const st = {...readState()};
      if (
        ![st.vma, st.s1lo, st.s1hi, st.s2].every(v => Number.isFinite(v) && v > 0) ||
        st.s1lo > st.s1hi ||
        st.s1hi >= st.s2 ||
        st.s2 >= st.vma
      )
        return null;
      const p = predict(st);
      st.v5 = p?.[0]?.v;
      st.v10 = p?.[1]?.v;
      return {st, p};
    }
    function loadToolBlock(block, refs) {
      const minutes = Number(String(block.minutes).trim().replace(',', '.'));
      if (!refs || !Number.isFinite(minutes) || minutes <= 0) return null;
      const {st, p} = refs;
      let speed;
      if (block.pace === 'manual') {
        if (block.unit === 'speed') speed = Number(String(block.manual).trim().replace(',', '.'));
        else {
          const m = /^(\d+):([0-5]\d)$/.exec(String(block.manual).trim());
          speed = m ? 3600 / (Number(m[1]) * 60 + Number(m[2])) : NaN;
        }
      } else if (block.pace === 'jogg') speed = st.s1lo * RULES.load.anchors.easyOfS1Low;
      else if (block.pace === 'ea') {
        const b = efBand('active', st);
        speed = (b[0] + b[1]) / 2;
      } else if (block.pace === 's1') speed = lt1Ref(st);
      else if (block.pace === 's2') speed = st.s2;
      else if (block.pace.startsWith('as')) speed = p?.[{as42: 3, as21: 2, as10: 1, as5: 0}[block.pace]]?.v;
      else if (['vma100', 'vma105', 'vma110'].includes(block.pace))
        speed = (st.vma * Number(block.pace.slice(3))) / 100;
      if (!Number.isFinite(speed) || speed <= 0) return null;
      const factor = programLoadFactor(speed, st, loadPersonalModel(refs)),
        points = minutes * factor;
      return Number.isFinite(points) ? {minutes, speed, factor, points} : null;
    }
    const loadToolNumber = n => n.toFixed(1).replace('.', ',');
    function loadToolResults() {
      const refs = loadToolReferences(),
        model = loadPersonalModel(refs),
        blocks = loadToolState.blocks.map(b => loadToolBlock(b, refs));
      return {
        refs,
        model,
        blocks,
        total: blocks.every(Boolean) ? blocks.reduce((sum, b) => sum + b.points, 0) : null,
        minutes: blocks.every(Boolean) ? blocks.reduce((sum, b) => sum + b.minutes, 0) : null
      };
    }
    function updateLoadCurveUi() {
      const el = $('scr-calc').querySelector('[data-load-curve]');
      if (el) {
        const restore = globalThis.document?.activeElement?.dataset?.loadPoint;
        el.innerHTML = loadCurveHtml(loadPersonalModel(loadToolReferences()), el.clientWidth);
        if (restore) el.querySelector?.('[aria-pressed="true"]')?.focus();
      }
    }
    globalThis.addEventListener?.('resize', () => {
      if (currentTab() === 'calc') updateLoadCurveUi();
    });
    $('scr-calc').addEventListener(
      'toggle',
      e => {
        if (e.target.open && e.target.querySelector?.('[data-load-curve]')) updateLoadCurveUi();
      },
      true
    );
    function updateLoadToolUi() {
      const root = $('scr-calc').querySelector('[data-load-tool]');
      if (!root) return;
      const r = loadToolResults();
      root.querySelector('[data-load-total]').textContent =
        r.total === null ? '—' : loadToolNumber(r.total) + ' pts';
      root.querySelector('[data-load-duration]').textContent =
        r.minutes === null ? '' : loadToolNumber(r.minutes) + ' min au total';
      root.querySelector('[data-load-message]').textContent = !r.refs
        ? 'Renseigne des repères VMA, S1 et S2 cohérents dans Repères.'
        : r.total === null
          ? 'Renseigne une durée et une allure valides pour chaque bloc.'
          : r.model.issues.length
            ? 'Repères spécifiques incompatibles ou hors plage : repli sur les ancrages S1/S2/VMA.'
            : r.blocks.some(b => b.speed > r.refs.st.vma * 1.1 + 1e-8)
              ? 'Au-delà de 110 % VMA : coefficient historique de prudence, hors de la courbe personnalisée.'
              : 'Même calcul de charge que le programme.';
      root.querySelectorAll('[data-load-result]').forEach(el => {
        const b = r.blocks[Number(el.dataset.loadResult)];
        el.textContent = b
          ? `${fmtPace(b.speed)} /km · × ${b.factor.toFixed(2).replace('.', ',')} = ${loadToolNumber(b.points)} pts`
          : 'Renseigne une durée et une allure valides.';
      });
    }
    function loadToolHtml() {
      return `<div class="card chronoPanel" data-load-tool><h2 class="calcTitle">Charge d’entraînement</h2><p class="lbl">Construis ta séance bloc par bloc, échauffement et retour au calme compris.</p>${loadToolState.blocks.map((b, i) => `<div class="loadToolBlock"><div class="settingsTitle"><b>Bloc ${i + 1}</b>${loadToolState.blocks.length > 1 ? `<button type="button" class="ghost" data-load-remove="${i}" aria-label="Supprimer le bloc ${i + 1}">Supprimer</button>` : ''}</div><div class="sf2"><label class="sf"><span>Durée (min)</span><input data-load-index="${i}" data-load-field="minutes" inputmode="decimal" value="${toolAttr(b.minutes)}" placeholder="30"></label><label class="sf"><span>Allure</span><select data-load-index="${i}" data-load-field="pace">${LOAD_PRESETS.map(([v, l]) => `<option value="${v}"${b.pace === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>${b.pace === 'manual' ? `<div class="sf2"><label class="sf"><span>Unité</span><select data-load-index="${i}" data-load-field="unit"><option value="pace"${b.unit === 'pace' ? ' selected' : ''}>min/km</option><option value="speed"${b.unit === 'speed' ? ' selected' : ''}>km/h</option></select></label><label class="sf"><span>${b.unit === 'speed' ? 'Vitesse (km/h)' : 'Allure (mm:ss/km)'}</span><input data-load-index="${i}" data-load-field="manual" inputmode="${b.unit === 'speed' ? 'decimal' : 'text'}" value="${toolAttr(b.manual)}" placeholder="${b.unit === 'speed' ? '12' : '5:00'}"></label></div>` : ''}<p class="lbl loadBlockResult" data-load-result="${i}" role="status">—</p></div>`).join('')}<button type="button" class="addRef" data-load-add>+ Ajouter un bloc</button><div class="conversionResult"><span>Charge totale</span><strong data-load-total role="status" aria-live="polite">—</strong></div><p class="lbl" data-load-duration></p><p class="lbl" data-load-message></p><details class="loadMethod" open><summary>Courbes personnalisées</summary><div data-load-curve></div></details><details class="loadMethod"><summary>Comprendre le calcul</summary><p class="lbl">Modèle personnalisé, hypothèses Planif : Jogg’ 0,20 ; S1 240 min et 0,30 ; S2 60 min et 0,60 ; 100 % VMA 6 min et 1,00. Les coefficients spécifiques sont interpolés selon le logarithme du chrono estimé, entre 6 min, 60 min et 240 min. Hors de cette plage, aucun coefficient n’est extrapolé dans le temps : repli explicite sur les ancrages en vitesse.</p><p class="lbl">À 105 % VMA : 1,20 ; à 110 % : 1,50, avec interpolation linéaire entre 100, 105 et 110 %. Pour EA et l’allure manuelle, interpolation en vitesse entre les points personnalisés ; sous Jogg’, plancher 0,20 ; au-delà de 110 %, coefficient historique de prudence, hors de la courbe personnalisée. En cas de contradiction, le programme et ce calculateur utilisent les seuls ancrages S1/S2/VMA, avec un avertissement.</p><p class="lbl">Le maintien est une hypothèse d’effort continu, distincte des minutes réellement courues dans le bloc. Au-dessus de 100 % VMA, aucun maintien n’est déduit. Les points ne comportent pas de majoration liée à la densité du fractionné. Ces choix ne sont pas une formule validée de Daniels.</p><p class="lbl">Chaque bloc vaut sa durée en minutes multipliée par son coefficient. Les récupérations courues, l’échauffement et le retour au calme sont comptés comme des blocs faciles à 0,20 point/minute.</p><p class="lbl">Compte aussi l’échauffement, les récupérations courues et le retour au calme. Ces points sont des repères de suivi, pas une mesure physiologique ni une équivalence exacte de fatigue. Le programme utilise le modèle personnalisé. L’ancienne charge reste un indicateur interne de sécurité pour les formats et la récupération.</p><p class="lbl">Source : Jack Daniels, <a href="https://www.human-kinetics.co.uk/9781718203662/daniels-running-formula/" target="_blank" rel="noopener noreferrer">Daniels’ Running Formula, 4e édition</a>, chapitre 4.</p></details></div>`;
    }
    $('scr-calc').addEventListener('input', e => {
      const {loadIndex, loadField} = e.target.dataset;
      if (!['minutes', 'manual'].includes(loadField)) return;
      const b = loadToolState.blocks[Number(loadIndex)];
      if (!b) return;
      b[loadField] = e.target.value;
      updateLoadToolUi();
    });
    $('scr-calc').addEventListener('change', e => {
      const {loadIndex, loadField} = e.target.dataset;
      if (!['pace', 'unit'].includes(loadField)) return;
      const b = loadToolState.blocks[Number(loadIndex)];
      if (!b) return;
      if (loadField === 'pace' && !LOAD_PRESETS.some(([key]) => key === e.target.value)) return;
      if (loadField === 'unit') {
        if (!['pace', 'speed'].includes(e.target.value)) return;
        const speed = loadToolBlock({...b, minutes: '1'}, loadToolReferences())?.speed;
        const seconds = speed ? Math.round(3600 / speed) : 0;
        b.manual = speed
          ? e.target.value === 'speed'
            ? String(Math.round(speed * 100) / 100)
            : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
          : '';
      }
      b[loadField] = e.target.value;
      renderApp();
    });
    $('scr-calc').addEventListener('click', e => {
      const point = e.target.closest('[data-load-point]');
      if (point) {
        loadCurveState.selected = point.dataset.loadPoint;
        updateLoadCurveUi();
        return;
      }
      if (e.target.closest('[data-load-add]')) {
        loadToolState.blocks.push({minutes: '10', pace: 'jogg', manual: '5:00', unit: 'pace'});
        renderApp();
        return;
      }
      const remove = e.target.closest('[data-load-remove]');
      if (remove && loadToolState.blocks.length > 1) {
        const i = Number(remove.dataset.loadRemove);
        if (Number.isInteger(i) && i >= 0 && i < loadToolState.blocks.length) {
          loadToolState.blocks.splice(i, 1);
          renderApp();
        }
      }
    });

    function heartRatePanelHtml() {
      const z = globalThis.PlanifStrava?.heartRateZones?.();
      const rows = z
        ? [
            ['Z1', '0–' + z.z1Max],
            ['Z2', z.z1Max + 1 + '–' + z.z2Max],
            ['Z3', z.z2Max + 1 + '–' + z.z3Max],
            ['Z4', z.z3Max + 1 + '–' + z.z4Max],
            ['Z5', '≥ ' + (z.z4Max + 1)]
          ]
        : [];
      const box = (name, value) =>
        `<label class="sf"><span>${name}</span><input type="text" value="${value ?? '—'}" disabled aria-label="${name} synchronisée depuis Flow Strava"></label>`;
      return `<div class="hrStravaPanel"><h3>Zones de FC</h3><p class="lbl">${z ? 'Synchronisées depuis Flow Strava · lecture seule.' : 'Connecte Flow Strava pour récupérer les zones de FC.'}</p><div class="physioHr">${fText('FC repos', 'hrMin', 'numeric')}${fText('FC max', 'hrMax', 'numeric')}${box('Z1 max', z?.z1Max)}${box('Z2 max', z?.z2Max)}${box('Z3 max', z?.z3Max)}${box('Z4 max', z?.z4Max)}</div>${rows.length ? `<div class="hrStravaRows">${rows.map(([name, range]) => `<div><strong>${name}</strong><span>${range} bpm</span></div>`).join('')}</div><p class="lbl">Z2 : endurance active · Z3 : S1/tempo · Z4 : S2 · Z5 : au-dessus du S2.</p>` : `<p class="lbl">En attendant la connexion, les plafonds locaux restent utilisés pour les séances.</p><div class="physioHr">${fText('Plafond EF', 'lt1Hr', 'numeric')}${fText('Plafond S2', 'lt2Hr', 'numeric')}</div>`}</div>`;
    }
    return {
      volumeChargeHtml,
      chronoToolHtml,
      enduranceToolHtml,
      criticalToolHtml,
      loadToolHtml,
      heartRatePanelHtml,
      updateToolsUi,
      updateLoadCurveUi,
      updateLoadToolUi
    };
  }
  return {create};
});
