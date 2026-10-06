// Deploy as the existing notifications web app, executing as its owner.
// Setup and activation instructions: README.md. Never put credentials in Expo.
const NOTIFICATIONS_FOLDER_NAME = "notifications";
const SUBSCRIBERS_FOLDER_NAME = "dv-opening-alerts-v1";
const MAX_REQUEST_LENGTH = 12 * 1024;
const MIN_FORM_AGE_MS = 1000;
const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_SECONDS = 60;
const ANNOUNCEMENTS = [
  "https://travel.state.gov/content/travel/en/News/visas-news/changes-to-2027-dv-program-entry-period.html",
  "https://travel.state.gov/content/travel/en/us-visas/immigrate/diversity-visa-program-entry/diversity-visa-instructions.html",
];

function doGet(e) {
  const query = e && e.parameter || {};
  if (query.action === "confirm" || query.action === "unsubscribe") {
    // GET never changes a subscription: mail link scanners may visit these URLs.
    const action = query.action;
    if (!validTokenQuery(query)) return htmlPage("This link is invalid.");
    const label = action === "confirm" ? "Confirm opening alert" : "Unsubscribe";
    return htmlPage(`<h1>${label}</h1><p>DV Lottery Tracker · Green Card Application Services</p>
      <form method="post" target="_top" action="${escapeHTML(ScriptApp.getService().getUrl())}">
      <input type="hidden" name="action" value="${action}">
      <input type="hidden" name="id" value="${query.id}">
      <input type="hidden" name="token" value="${query.token}">
      <button type="submit">${label}</button></form>`);
  }
  return jsonResponse({ ok: true, version: 1, emailDelivery: deliveryEnabled(), window: verifiedWindow() });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    if (e && e.parameter && ["confirm", "unsubscribe"].includes(e.parameter.action)) {
      return changeSubscription(e.parameter);
    }
    const payload = validateAndNormalizeRequest(parseRequestBody(e));
    enforceRateLimit(payload);
    if (!payload.email) {
      // Preserve the website's legacy WhatsApp request collection. No SMS sender.
      const root = DriveApp.getFolderById(requiredScriptProperty("ROOT_FOLDER_ID"));
      getOrCreateFolder(root, NOTIFICATIONS_FOLDER_NAME).createFile(
        `phone-${Utilities.getUuid()}.json`, JSON.stringify(payload), "application/json");
      return jsonResponse({ ok: true, state: "collecting" });
    }
    const record = saveSubscriber(payload);
    if (record.data.confirmedAt && !record.data.unsubscribedAt) {
      return jsonResponse({ ok: true, state: "already_confirmed" });
    }
    if (deliveryEnabled() && MailApp.getRemainingDailyQuota() > 5) {
      sendConfirmation(record);
      return jsonResponse({ ok: true, state: "confirmation_sent" });
    }
    return jsonResponse({ ok: true, state: deliveryEnabled() ? "confirmation_pending" : "collecting" });
  } catch (error) {
    // Do not log addresses, tokens or full request bodies.
    console.error("Registration alert request failed.");
    return jsonResponse({ ok: false, error: "Request rejected." });
  } finally { if (lock.hasLock()) lock.releaseLock(); }
}

function properties() { return PropertiesService.getScriptProperties(); }
function deliveryEnabled() {
  return properties().getProperty("DELIVERY_ENABLED") === "true" &&
    ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === "runRegistrationAlerts");
}
function subscriberFolder() {
  return getOrCreateFolder(DriveApp.getFolderById(requiredScriptProperty("ROOT_FOLDER_ID")), SUBSCRIBERS_FOLDER_NAME);
}
function newToken() { return Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, ""); }
function saveSubscriber(payload) {
  const id = sha256(payload.email);
  const files = subscriberFolder().getFilesByName(`${id}.json`);
  const file = files.hasNext() ? files.next() : null;
  const old = file ? JSON.parse(file.getBlob().getDataAsString()) : null;
  if (old && !old.unsubscribedAt && (old.confirmedAt || Date.now() - Date.parse(old.receivedAt) <= 30 * 86400000)) return { file, data: old };
  const data = { ...payload, id, token: newToken(), receivedAt: new Date().toISOString(),
    confirmedAt: null, confirmationSentAt: null, unsubscribedAt: null, deliveredProgram: null };
  if (file) file.setContent(JSON.stringify(data));
  return { file: file || subscriberFolder().createFile(`${id}.json`, JSON.stringify(data), "application/json"), data };
}
function persist(record) { record.file.setContent(JSON.stringify(record.data)); }
function actionURL(data, action) {
  return `${ScriptApp.getService().getUrl()}?action=${action}&id=${data.id}&token=${data.token}`;
}
function sendConfirmation(record) {
  // Retries do not repeatedly email an unconfirmed address.
  if (record.data.confirmationSentAt) return;
  MailApp.sendEmail({ to: record.data.email, name: "DV Lottery Tracker",
    subject: "Confirm your DV registration opening alert",
    body: `You requested one DV registration opening alert from Green Card Application Services. No account or marketing signup is required.

Confirm: ${actionURL(record.data, "confirm")}

Cancel: ${actionURL(record.data, "unsubscribe")}

If you did not request this, ignore this email. Unconfirmed requests expire after 30 days.

We are an independent service, not the U.S. government. https://greencardapplicationservices.com/policies/#privacy` });
  record.data.confirmationSentAt = new Date().toISOString();
  persist(record);
}
function validTokenQuery(q) { return /^[a-f0-9]{64}$/.test(q.id || "") && /^[a-f0-9]{64}$/.test(q.token || ""); }
function changeSubscription(query) {
  if (!validTokenQuery(query)) return htmlPage("This link is invalid.");
  const files = subscriberFolder().getFilesByName(`${query.id}.json`);
  if (!files.hasNext()) return htmlPage("This request has expired or was removed.");
  const file = files.next(), data = JSON.parse(file.getBlob().getDataAsString());
  if (data.token !== query.token) return htmlPage("This link has expired.");
  if (query.action === "unsubscribe") data.unsubscribedAt = new Date().toISOString();
  else {
    if (data.unsubscribedAt || Date.now() - Date.parse(data.receivedAt) > 30 * 86400000) return htmlPage("This request has expired. Please request a new alert in the app.");
    data.confirmedAt = data.confirmedAt || new Date().toISOString();
  }
  file.setContent(JSON.stringify(data));
  return htmlPage(query.action === "unsubscribe" ? "You are unsubscribed. No more emails will be sent for this request." : "Your email is confirmed for one upcoming DV registration opening alert.");
}
function htmlPage(content) {
  return HtmlService.createHtmlOutput(`<!doctype html><html><meta name="viewport" content="width=device-width, initial-scale=1"><title>DV Lottery Tracker</title><body style="font:18px system-ui;max-width:540px;margin:60px auto;padding:24px;color:#10294A">${content}</body></html>`);
}
function escapeHTML(value) { return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

function verifiedWindow() {
  // Only an operator-reviewed official REGISTRATION window can be published.
  // A page hash or keyword is never used to infer that registration opened.
  try {
    const w = JSON.parse(properties().getProperty("VERIFIED_WINDOW_JSON") || "null");
    if (!w || !/^DV-20\d{2}$/.test(w.program) ||
        !/^https:\/\/travel\.state\.gov\/content\/travel\//.test(w.sourceURL) ||
        ![w.opensAt, w.closesAt, w.verifiedAt].every(v => typeof v === "string" && /Z$|[+-]\d\d:\d\d$/.test(v) && Number.isFinite(Date.parse(v))) ||
        Date.parse(w.closesAt) <= Date.parse(w.opensAt) ||
        Date.parse(w.closesAt) - Date.parse(w.opensAt) > 100 * 86400000 || Date.parse(w.verifiedAt) > Date.now()) return null;
    return { program: w.program, opensAt: w.opensAt, closesAt: w.closesAt, sourceURL: w.sourceURL, verifiedAt: w.verifiedAt };
  } catch (_) { return null; }
}

// Install once from the Apps Script editor after configuring and testing.
function installRegistrationAlertTrigger() {
  requiredScriptProperty("ROOT_FOLDER_ID");
  requiredScriptProperty("ALLOWED_WEBSITES");
  requiredScriptProperty("ADMIN_EMAIL");
  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (trigger.getHandlerFunction() === "runRegistrationAlerts") ScriptApp.deleteTrigger(trigger);
  }
  ScriptApp.newTrigger("runRegistrationAlerts").timeBased().everyMinutes(15).create();
}

function runRegistrationAlerts() {
  if (properties().getProperty("DELIVERY_ENABLED") !== "true") return;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    try { monitorOfficialPages(); } catch (_) { console.error("Official-source monitoring needs attention."); }
    const w = verifiedWindow(), now = Date.now();
    const isOpen = w && now >= Date.parse(w.opensAt) && now < Date.parse(w.closesAt);
    const folder = subscriberFolder();
    const cursor = properties().getProperty("SUBSCRIBER_CURSOR");
    let files;
    try { files = cursor ? DriveApp.continueFileIterator(cursor) : folder.getFiles(); }
    catch (_) { files = folder.getFiles(); }
    const start = Date.now();
    while (files.hasNext() && Date.now() - start < 180000 && MailApp.getRemainingDailyQuota() > 5) {
      const file = files.next();
      try {
        const data = JSON.parse(file.getBlob().getDataAsString());
        if (data.unsubscribedAt || data.deliveredProgram || (!data.confirmedAt && now - Date.parse(data.receivedAt) > 30 * 86400000)) {
          // Retain consent/delivery evidence for 30 days, then remove private record.
          const terminalAt = Date.parse(data.unsubscribedAt || data.deliveredAt || data.receivedAt);
          if (now - terminalAt > 30 * 86400000) file.setTrashed(true);
          continue;
        }
        const record = { file, data };
        if (!data.confirmedAt) { sendConfirmation(record); continue; }
        if (!isOpen) continue;
        // MailApp offers no transactional idempotency. A crash between send and
        // persist can duplicate this email; ordinary subsequent runs deduplicate.
        MailApp.sendEmail({ to: data.email, name: "DV Lottery Tracker",
          subject: `${w.program} registration window is open`,
          body: `The U.S. Department of State's verified ${w.program} registration window is now open.

Official announcement: ${w.sourceURL}
Official entry portal: https://dvprogram.state.gov/
Opens: ${w.opensAt}
Closes: ${w.closesAt}
Times above include a UTC offset. Check the official page for current instructions and any changes.

This email does not submit an entry or mean you were selected. We are an independent service, not the government.

You requested this one-time opening alert. Unsubscribe: ${actionURL(data, "unsubscribe")}
https://greencardapplicationservices.com/policies/#privacy` });
        data.deliveredProgram = w.program;
        data.deliveredAt = new Date().toISOString();
        persist(record);
      } catch (_) { console.error("A subscriber could not be processed; retry on the next pass."); }
    }
    if (files.hasNext()) properties().setProperty("SUBSCRIBER_CURSOR", files.getContinuationToken());
    else properties().deleteProperty("SUBSCRIBER_CURSOR");
  } finally { lock.releaseLock(); }
}

function monitorOfficialPages() {
  const props = properties();
  if (Date.now() - Number(props.getProperty("SOURCE_CHECK_AT") || 0) < 6 * 3600000) return;
  const changed = [], failed = [];
  for (const url of ANNOUNCEMENTS) {
    try {
      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
      if (response.getResponseCode() !== 200) throw new Error("Source unavailable");
      const html = response.getContentText();
      const body = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (body.length < 500 || !/diversity/i.test(body)) throw new Error("Unexpected source");
      const key = `SOURCE_HASH_${sha256(url).slice(0, 16)}`, hash = sha256(body), previous = props.getProperty(key);
      if (hash !== previous) changed.push(url);
      props.setProperty(key, hash);
    } catch (_) { failed.push(url); }
  }
  if ((changed.length || failed.length) && MailApp.getRemainingDailyQuota() > 0) {
    MailApp.sendEmail({ to: requiredScriptProperty("ADMIN_EMAIL"), subject: "Review DV official announcement sources",
      body: `Review these official pages. A detected change is not evidence that registration is open. Publish VERIFIED_WINDOW_JSON only after checking the program year, registration dates and timezone.

Changed or first checked:
${changed.join("\n")}

Fetch failures:
${failed.join("\n")}

If an announced window is cancelled or changed, update or remove VERIFIED_WINDOW_JSON promptly. Existing app copies refresh when opened.` });
  }
  props.setProperty("SOURCE_CHECK_AT", String(Date.now()));
}

// One-time migration from the website collector. Never treats old consent as
// email verification. Confirmation emails require DELIVERY_ENABLED + the trigger.
function importLegacyEmailRequests() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const root = DriveApp.getFolderById(requiredScriptProperty("ROOT_FOLDER_ID"));
    const folder = getOrCreateFolder(root, NOTIFICATIONS_FOLDER_NAME);
    const cursor = properties().getProperty("LEGACY_CURSOR");
    let files;
    try { files = cursor ? DriveApp.continueFileIterator(cursor) : folder.getFiles(); }
    catch (_) { files = folder.getFiles(); }
    let count = 0;
    while (files.hasNext() && count++ < 100) {
      const file = files.next();
      try {
        const p = JSON.parse(file.getBlob().getDataAsString());
        if (p.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email) && p.consent &&
            Date.now() - Date.parse(p.receivedAt || p.submittedAt) < 30 * 86400000) {
          saveSubscriber({ ...p, email: p.email.trim().toLowerCase(), marketingConsent: false });
        }
      } catch (_) { console.error("Skipped invalid legacy request."); }
    }
    if (files.hasNext()) properties().setProperty("LEGACY_CURSOR", files.getContinuationToken());
    else properties().deleteProperty("LEGACY_CURSOR");
  } finally { lock.releaseLock(); }
}

function parseRequestBody(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Missing request body.");
  }

  if (e.postData.contents.length > MAX_REQUEST_LENGTH) {
    throw new Error("Request body is too large.");
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error("Request body must be valid JSON.");
  }
}

function validateAndNormalizeRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Invalid request body.");
  }

  if (cleanText(body.notifyCompanyWebsite, 100)) {
    throw new Error("Automated submission rejected.");
  }

  const website = cleanText(body.website, 100).toLowerCase();
  const allowedWebsites = requiredScriptProperty("ALLOWED_WEBSITES")
    .split(",")
    .map(function (value) {
      return cleanText(value, 100).toLowerCase();
    })
    .filter(String);

  if (allowedWebsites.indexOf(website) === -1) {
    throw new Error("Website is not allowed.");
  }

  const email = cleanText(body.email, 254).toLowerCase();
  const phone = cleanText(body.phone, 32);

  if (!email && !phone) {
    throw new Error("Email or phone is required.");
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Email is invalid.");
  }

  if (phone && !/^[0-9+().\-\s]{6,32}$/.test(phone)) {
    throw new Error("Phone is invalid.");
  }

  const submittedAt = validRecentDate(body.submittedAt, "Submission time");
  const formStartedAt = validRecentDate(body.formStartedAt, "Form start time");
  const formAge = new Date(submittedAt).getTime() - new Date(formStartedAt).getTime();

  if (formAge < MIN_FORM_AGE_MS || formAge > MAX_FORM_AGE_MS) {
    throw new Error("Form timing is invalid.");
  }

  const consent = cleanText(body.consent, 240);
  if (!consent) {
    throw new Error("Consent is required.");
  }

  return {
    notificationId: cleanText(body.notificationId || Utilities.getUuid(), 100),
    submittedAt: submittedAt,
    website: website,
    sourcePage: cleanPath(body.sourcePage),
    email: email,
    phone: phone,
    consent: consent,
    marketingConsent: body.marketingConsent === true,
  };
}

function enforceRateLimit(payload) {
  const cache = CacheService.getScriptCache();
  const rateKey = `notify-${sha256(payload.email || payload.phone)}`;

  if (cache.get(rateKey)) {
    throw new Error("Duplicate request.");
  }

  cache.put(rateKey, "1", RATE_LIMIT_SECONDS);
}

function validRecentDate(value, label) {
  const cleaned = cleanText(value, 40);
  const parsed = new Date(cleaned);
  const now = Date.now();

  if (
    !cleaned ||
    Number.isNaN(parsed.getTime()) ||
    parsed.getTime() > now + 5 * 60 * 1000 ||
    parsed.getTime() < now - MAX_FORM_AGE_MS
  ) {
    throw new Error(`${label} is invalid.`);
  }

  return parsed.toISOString();
}

function requiredScriptProperty(name) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) throw new Error(`Missing script property: ${name}`);
  return value;
}

function getOrCreateFolder(parentFolder, folderName) {
  const existingFolders = parentFolder.getFoldersByName(folderName);
  return existingFolders.hasNext()
    ? existingFolders.next()
    : parentFolder.createFolder(folderName);
}

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength || 200);
}

function cleanPath(value) {
  const path = cleanText(value, 200);
  return path.charAt(0) === "/" ? path : "/";
}

function safeFilePart(value) {
  const cleaned = cleanText(value, 100)
    .replace(/[^a-zA-Z0-9@._+-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return cleaned || "unknown";
}

function sha256(value) {
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value),
    Utilities.Charset.UTF_8,
  )
    .map(function (byte) {
      return (byte + 256).toString(16).slice(-2);
    })
    .join("");
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
