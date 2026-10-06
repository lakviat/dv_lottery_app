const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');

function fixture() {
  const now = Date.now();
  const props = new Map([
    ['ROOT_FOLDER_ID', 'private-folder'],
    ['ALLOWED_WEBSITES', 'greencardapplicationservices.com'],
    ['ADMIN_EMAIL', 'operator@example.com'],
    ['SOURCE_CHECK_AT', String(now)],
  ]);
  const files = new Map(), messages = [], rates = new Map();
  const iterate = values => { let i = 0; return { hasNext: () => i < values.length, next: () => values[i++], getContinuationToken: () => 'cursor' }; };
  const folder = {
    getFoldersByName: () => iterate([folder]),
    getFilesByName: name => iterate(files.has(name) ? [files.get(name)] : []),
    getFiles: () => iterate([...files.values()]),
    createFile(name, contents) {
      const file = { getBlob: () => ({ getDataAsString: () => contents }), setContent: value => { contents = value; }, setTrashed: () => files.delete(name) };
      files.set(name, file); return file;
    },
  };
  let held = false;
  const lock = { waitLock: () => { held = true; }, tryLock: () => { held = true; return true; }, hasLock: () => held, releaseLock: () => { held = false; } };
  const context = vm.createContext({
    console, Date,
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => props.get(key) || null, setProperty: (key, value) => props.set(key, value), deleteProperty: key => props.delete(key) }) },
    ScriptApp: { getProjectTriggers: () => [{ getHandlerFunction: () => 'runRegistrationAlerts' }], getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/test/exec' }) },
    LockService: { getScriptLock: () => lock },
    CacheService: { getScriptCache: () => ({ get: key => rates.get(key), put: (key, value) => rates.set(key, value) }) },
    DriveApp: { getFolderById: () => folder },
    Utilities: { getUuid: crypto.randomUUID, DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }, computeDigest: (_alg, value) => [...crypto.createHash('sha256').update(value).digest()] },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
    HtmlService: { createHtmlOutput: html => html },
    MailApp: { getRemainingDailyQuota: () => 100, sendEmail: message => messages.push(message) },
    UrlFetchApp: { fetch: () => { throw new Error('No network permitted in tests'); } },
  });
  vm.runInContext(fs.readFileSync(__dirname + '/Code.gs', 'utf8'), context);
  const post = (email = 'test@example.com', overrides = {}) => context.doPost({ postData: { contents: JSON.stringify({ email, website: 'greencardapplicationservices.com', sourcePage: '/ios-app/registration-alerts', consent: 'Requested opening alert only', submittedAt: new Date().toISOString(), formStartedAt: new Date(Date.now() - 3000).toISOString(), ...overrides }) } });
  const record = () => JSON.parse([...files.values()][0].getBlob().getDataAsString());
  const setWindow = (overrides = {}) => props.set('VERIFIED_WINDOW_JSON', JSON.stringify({ program: 'DV-2028', opensAt: new Date(now - 10000).toISOString(), closesAt: new Date(now + 86400000).toISOString(), verifiedAt: new Date(now - 20000).toISOString(), sourceURL: 'https://travel.state.gov/content/travel/en/News/visas-news/test.html', ...overrides }));
  return { context, props, files, rates, messages, post, record, setWindow };
}

test('collection stays inert until delivery is activated; requests deduplicate', () => {
  const f = fixture();
  assert.equal(f.post().state, 'collecting');
  assert.equal(f.context.doGet().emailDelivery, false);
  f.rates.clear();
  assert.equal(f.post().ok, true);
  assert.equal(f.files.size, 1);
  f.context.runRegistrationAlerts();
  assert.equal(f.messages.length, 0);
});

test('confirmation is required; link scanners do not opt in; only one opening alert', () => {
  const f = fixture();
  f.props.set('DELIVERY_ENABLED', 'true');
  f.setWindow();
  assert.equal(f.post().state, 'confirmation_sent');
  assert.equal(f.messages.length, 1);
  const r = f.record(), query = { action: 'confirm', id: r.id, token: r.token };
  f.context.doGet({ parameter: query });
  assert.equal(f.record().confirmedAt, null);
  f.context.runRegistrationAlerts();
  assert.equal(f.messages.length, 1);
  f.context.doPost({ parameter: query });
  assert.ok(f.record().confirmedAt);
  f.context.runRegistrationAlerts();
  f.context.runRegistrationAlerts();
  assert.equal(f.messages.length, 2);
  assert.match(f.messages[1].body, /dvprogram.state.gov/);
  assert.equal(f.record().deliveredProgram, 'DV-2028');
});

test('unsubscribe is authenticated and prevents delivery', () => {
  const f = fixture();
  f.props.set('DELIVERY_ENABLED', 'true');
  f.post();
  const r = f.record();
  f.context.doPost({ parameter: { action: 'confirm', id: r.id, token: r.token } });
  f.context.doPost({ parameter: { action: 'unsubscribe', id: r.id, token: '0'.repeat(64) } });
  assert.equal(f.record().unsubscribedAt, null);
  f.context.doPost({ parameter: { action: 'unsubscribe', id: r.id, token: r.token } });
  f.setWindow();
  f.context.runRegistrationAlerts();
  assert.equal(f.messages.length, 1);
  assert.ok(f.record().unsubscribedAt);
});

test('unknown, future, closed and unrelated-year-long windows never trigger opening mail', () => {
  const f = fixture();
  f.props.set('DELIVERY_ENABLED', 'true');
  f.post();
  const r = f.record();
  f.context.doPost({ parameter: { action: 'confirm', id: r.id, token: r.token } });
  f.context.runRegistrationAlerts();
  f.setWindow({ opensAt: new Date(Date.now() + 3600000).toISOString() });
  f.context.runRegistrationAlerts();
  f.setWindow({ closesAt: new Date(Date.now() - 1000).toISOString() });
  f.context.runRegistrationAlerts();
  f.setWindow({ closesAt: new Date(Date.now() + 365 * 86400000).toISOString() });
  assert.equal(f.context.doGet().window, null);
  f.context.runRegistrationAlerts();
  assert.equal(f.messages.length, 1);
});

test('invalid requests cannot save or send email', () => {
  const f = fixture();
  for (const overrides of [{ consent: '' }, { notifyCompanyWebsite: 'spam' }, { website: 'unrelated.test' }]) assert.equal(f.post('test@example.com', overrides).ok, false);
  assert.equal(f.post('invalid').ok, false);
  assert.equal(f.files.size, 0);
  assert.equal(f.messages.length, 0);
});

test('exhausted quota queues confirmation and retries without claiming it was sent', () => {
  const f = fixture();
  f.props.set('DELIVERY_ENABLED', 'true');
  f.context.MailApp.getRemainingDailyQuota = () => 0;
  assert.equal(f.post().state, 'confirmation_pending');
  f.context.runRegistrationAlerts();
  assert.equal(f.messages.length, 0);
  f.context.MailApp.getRemainingDailyQuota = () => 100;
  f.context.runRegistrationAlerts();
  f.context.runRegistrationAlerts();
  assert.equal(f.messages.length, 1);
  assert.ok(f.record().confirmationSentAt);
  assert.equal(f.record().confirmedAt, null);
});

test('official page changes notify the owner, never invent an opening date', () => {
  const f = fixture();
  f.props.set('DELIVERY_ENABLED', 'true');
  f.props.set('SOURCE_CHECK_AT', '0');
  f.context.UrlFetchApp.fetch = () => ({ getResponseCode: () => 200, getContentText: () => '<main>Diversity visa registration ' + 'example '.repeat(100) + '</main>' });
  f.context.runRegistrationAlerts();
  assert.equal(f.messages.length, 1);
  assert.equal(f.messages[0].to, 'operator@example.com');
  assert.match(f.messages[0].subject, /Review/);
  assert.equal(f.context.doGet().window, null);
});
