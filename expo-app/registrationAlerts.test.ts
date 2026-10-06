import test from "node:test";
import assert from "node:assert/strict";
import { alertConsent, officialAnnouncementURL, parseAlertFeed, registrationSummary, requestOpeningEmail, validAlertEmail } from "./registrationAlerts";

const now = Date.parse("2026-10-05T14:00:00Z");
// Fictional window for testing, not a published announcement.
const window = { program: "DV-2028", opensAt: "2026-11-01T16:00:00Z", closesAt: "2026-12-01T17:00:00Z", verifiedAt: "2026-10-05T12:00:00Z", sourceURL: "https://travel.state.gov/content/travel/en/News/visas-news/test-fixture.html" };

test("legacy collector does not imply active delivery or a verified opening", () => {
  assert.deepEqual(parseAlertFeed({ ok: true }, now), { emailDelivery: false, window: null });
  assert.deepEqual(parseAlertFeed({ ok: false, version: 1, emailDelivery: true, window }, now), { emailDelivery: false, window: null });
  assert.match(registrationSummary(parseAlertFeed({ ok: true }, now)), /not yet confirmed/);
});

test("only official, explicit and ordered registration windows are accepted", () => {
  const parse = (w: object) => parseAlertFeed({ ok: true, version: 1, emailDelivery: true, window: w }, now);
  assert.deepEqual(parse(window).window, { ...window, opensAt: new Date(window.opensAt).toISOString(), closesAt: new Date(window.closesAt).toISOString(), verifiedAt: new Date(window.verifiedAt).toISOString() });
  for (const bad of [
    { ...window, sourceURL: "https://travel.state.gov.attacker.com/content/travel/test" },
    { ...window, sourceURL: "https://user:password@travel.state.gov/content/travel/test" },
    { ...window, opensAt: "2026-11-01T12:00:00" },
    { ...window, closesAt: window.opensAt },
    { ...window, closesAt: "2027-09-30T23:00:00Z" }, // visa issuance period is not registration
    { ...window, verifiedAt: "2029-01-01T12:00:00Z" },
  ]) assert.equal(parse(bad).window, null);
  assert.equal(officialAnnouncementURL("http://travel.state.gov/content/travel/a"), false);
  assert.match(registrationSummary(parse(window), Date.parse(window.opensAt)), /is open/);
  assert.match(registrationSummary(parse(window), Date.parse(window.closesAt)), /has closed/);
});

test("email opt-in validates consent and sends only the documented contact payload", async () => {
  assert.equal(validAlertEmail(" test@example.com "), true);
  assert.equal(validAlertEmail("not an email"), false);
  const original = globalThis.fetch;
  let calls = 0, body: any;
  globalThis.fetch = async (_url, init) => {
    calls++; body = JSON.parse(init?.body as string);
    return new Response(JSON.stringify({ ok: true, state: "confirmation_sent" }));
  };
  try {
    await assert.rejects(requestOpeningEmail("a@example.com", false, Date.now() - 3000, "test"), /agree/);
    await assert.rejects(requestOpeningEmail("invalid", true, Date.now() - 3000, "test"), /valid email/);
    assert.equal(calls, 0);
    assert.equal(await requestOpeningEmail(" TEST@example.com ", true, Date.now() - 3000, "stable-id"), "confirmation_sent");
    assert.equal(body.email, "test@example.com");
    assert.equal(body.consent, alertConsent);
    assert.equal(body.marketingConsent, false);
    assert.equal(body.notificationId, "stable-id");
    assert.deepEqual(Object.keys(body).sort(), ["notificationId", "submittedAt", "formStartedAt", "website", "sourcePage", "email", "phone", "notifyCompanyWebsite", "consent", "marketingConsent"].sort());
  } finally { globalThis.fetch = original; }
});

test("email responses distinguish request collection from delivery and reject failures", async () => {
  const original = globalThis.fetch;
  const send = () => requestOpeningEmail("test@example.com", true, Date.now() - 3000, "id");
  try {
    globalThis.fetch = async () => new Response('{"ok":true}');
    assert.equal(await send(), "collecting");
    globalThis.fetch = async () => new Response('{"ok":false}');
    await assert.rejects(send(), /not accepted/);
    globalThis.fetch = async () => new Response("<html>Sign in</html>");
    await assert.rejects(send());
    globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
    await assert.rejects(send(), /unavailable/);
  } finally { globalThis.fetch = original; }
});
