// End-to-end scenarios in Chromium: saved plan, time zones, Calcul tools, backup and offline use.
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path'),
  {test, before, after} = require('node:test');
const {
  chromium,
  startServer,
  STATE,
  seedPlan,
  calendarDays,
  openApp,
  ready,
  reload
} = require('./helpers.cjs');

let browser, server, url;
before(async () => {
  ({server, url} = await startServer());
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  server?.close();
});

test('a saved plan opens on every tab without page errors', async () => {
  const {context, page, errors} = await openApp(browser, url);
  await seedPlan(page);
  await reload(page);
  for (const tab of ['today', 'cal', 'ref', 'calc', 'study', 'set']) {
    await page.click(`[data-tab="${tab}"]`);
    const text = (await page.textContent(`#scr-${tab}`)).trim();
    assert(text.length > 50, `${tab} renders content`);
    if (tab === 'cal') {
      await page.click('#scr-cal [data-timeline]');
      const phase = page.locator('#scr-cal .phaseList [data-css-c]').first();
      const segment = page.locator('#scr-cal .calVolume .bar [data-css-bg]').first();
      assert(await phase.evaluate(el => el.style.getPropertyValue('--c').trim() === el.dataset.cssC));
      assert(await segment.evaluate(el => el.style.width.endsWith('%')));
      assert.notEqual(await segment.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
    }
  }
  assert.match(await page.textContent('#scr-set'), /10 km · 2027-01-31/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('a plan saved in Paris keeps its days in Los Angeles and Auckland', async () => {
  const paris = await openApp(browser, url, {timezoneId: 'Europe/Paris'});
  const days = await seedPlan(paris.page);
  const stored = await paris.page.evaluate(() => localStorage.getItem('planif-active-plan-v1'));
  await paris.context.close();
  for (const timezoneId of ['America/Los_Angeles', 'Pacific/Auckland']) {
    const {context, page, errors} = await openApp(browser, url, {timezoneId});
    await page.evaluate(value => {
      localStorage.setItem('planif-active-plan-v1', value);
      localStorage.setItem('planif-mode-v1', 'cal');
      localStorage.setItem('planif-weekly-balance-v2', 'saved');
      // Exercise the actual saved-plan recovery path with no regeneration.
      localStorage.setItem(
        'planif-recovery-state-v1',
        JSON.stringify({id: JSON.parse(value).id, status: 'restored'})
      );
    }, stored);
    await reload(page);
    assert.deepEqual(await calendarDays(page), days, timezoneId);
    assert.deepEqual(errors, []);
    await context.close();
  }
});

test('the Calcul load calculator updates its total', async () => {
  const {context, page, errors} = await openApp(browser, url);
  await seedPlan(page);
  await reload(page);
  await page.click('[data-tab="calc"]');
  for (const tool of [
    '[data-chrono-tool]',
    '[data-endurance-tool]',
    '[data-critical-tool]',
    '[data-load-tool]'
  ])
    assert(await page.$(tool), tool);
  assert.equal((await page.textContent('[data-load-total]')).trim(), '6,0 pts');
  await page.click('[data-load-add]');
  await page.fill('[data-load-index="1"][data-load-field="minutes"]', '20');
  assert.equal((await page.textContent('[data-load-total]')).trim(), '10,0 pts');
  assert.deepEqual(errors, []);
  await context.close();
});

test('a backup exported in Paris is imported on another device, and a trapped file is refused', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'planif-e2e-'));
  try {
    const paris = await openApp(browser, url, {timezoneId: 'Europe/Paris', acceptDownloads: true});
    const days = await seedPlan(paris.page, {id: 'plan-paris'});
    await reload(paris.page);
    await paris.page.click('[data-tab="set"]');
    const [download] = await Promise.all([
      paris.page.waitForEvent('download'),
      paris.page.click('[data-act="export"]')
    ]);
    const file = path.join(dir, download.suggestedFilename());
    await download.saveAs(file);
    assert.match(path.basename(file), /^planif-sauvegarde-\d{4}-\d{2}-\d{2}\.json$/);
    await paris.context.close();

    const {context, page, errors} = await openApp(browser, url, {timezoneId: 'America/Los_Angeles'});
    await seedPlan(page, {
      id: 'plan-la',
      state: {...STATE, calStart: '2026-12-07', calRace: '2027-03-14'}
    });
    await reload(page);
    await page.click('[data-tab="set"]');
    let confirmText = '';
    page.on('dialog', dialog => {
      confirmText = dialog.message();
      dialog.accept();
    });
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('[data-act="import"]')
    ]);
    await Promise.all([page.waitForEvent('load'), chooser.setFiles(file)]);
    await ready(page);
    assert.match(confirmText, /Importer cette sauvegarde/);
    const state = await page.evaluate(() => ({
      active: JSON.parse(localStorage.getItem('planif-active-plan-v1')).id,
      history: JSON.parse(localStorage.getItem('planif-plan-history-v1')).map(r => r.id),
      safety: Object.keys(localStorage).filter(k => k.startsWith('planif-before-import-')).length
    }));
    assert.equal(state.active, 'plan-paris');
    assert(state.history.includes('plan-la'), 'the local plan is archived');
    assert.equal(state.safety, 1);
    assert.deepEqual(await calendarDays(page), days, 'imported days are unchanged in the calendar');

    const trapped = JSON.parse(fs.readFileSync(file, 'utf8')),
      plan = JSON.parse(trapped.values['planif-active-plan-v1']);
    plan.title = '<img src=x>';
    trapped.values['planif-active-plan-v1'] = JSON.stringify(plan);
    const trappedFile = path.join(dir, 'trapped.json');
    fs.writeFileSync(trappedFile, JSON.stringify(trapped));
    await page.click('[data-tab="set"]');
    const [chooser2] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('[data-act="import"]')
    ]);
    await chooser2.setFiles(trappedFile);
    await page.waitForFunction(() =>
      /refusé/.test(document.querySelector('#backupStatus')?.textContent || '')
    );
    assert.equal(
      await page.evaluate(() => JSON.parse(localStorage.getItem('planif-active-plan-v1')).id),
      'plan-paris'
    );
    assert.deepEqual(errors, []);
    await context.close();
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test('the app reopens offline from the service worker cache', async () => {
  const {context, page, errors} = await openApp(browser, url);
  await seedPlan(page);
  await reload(page);
  // Wait for control and the installed shell, with a timeout if offline support breaks.
  await page.waitForFunction(
    async () =>
      Boolean(navigator.serviceWorker.controller) && (await caches.keys()).some(k => k.startsWith('planif-'))
  );
  await context.setOffline(true);
  await reload(page);
  await page.click('[data-tab="cal"]');
  await page.locator('#scr-cal button.cwHead[data-week]').first().waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});
