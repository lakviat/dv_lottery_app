// Public collection URL already used by Green Card Application Services.
// No Stripe keys, application records, passport fields or photos belong here.
export const alertServiceURL =
  "https://script.google.com/macros/s/AKfycbzfG-PHP8OR4qR6YGP1dcJ9eXQ8Crrg9ag1jG_WonTdGpwRVcsL5TMDfQADyqnyMg60/exec";
export const alertConsent =
  "I agree to share my email with Green Card Application Services for a confirmation email and one DV registration opening alert. No marketing.";

export type RegistrationWindow = {
  program: string;
  opensAt: string;
  closesAt: string;
  sourceURL: string;
  verifiedAt: string;
};
export type AlertFeed = {
  emailDelivery: boolean;
  window: RegistrationWindow | null;
};
export const unknownFeed: AlertFeed = { emailDelivery: false, window: null };

export function validAlertEmail(value: string): boolean {
  return value.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function officialAnnouncementURL(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "travel.state.gov" &&
      !url.username && !url.password && url.port === "" && url.pathname.startsWith("/content/travel/");
  } catch { return false; }
}

// A legacy collector's {ok:true} is not evidence of automatic delivery or dates.
export function parseAlertFeed(raw: unknown, now = Date.now()): AlertFeed {
  const data = raw as Record<string, any> | null;
  if (!data || data.ok !== true || data.version !== 1) return unknownFeed;
  const feed: AlertFeed = { emailDelivery: data.emailDelivery === true, window: null };
  const w = data.window;
  if (!w || typeof w !== "object") return feed;
  const open = Date.parse(w.opensAt), close = Date.parse(w.closesAt), verified = Date.parse(w.verifiedAt);
  if (!/^DV-20\d{2}$/.test(w.program) || !officialAnnouncementURL(w.sourceURL) ||
      ![open, close, verified].every(Number.isFinite) || close <= open ||
      close - open > 100 * 86400000 || verified > now + 300000 ||
      !/Z$|[+-]\d\d:\d\d$/.test(w.opensAt) || !/Z$|[+-]\d\d:\d\d$/.test(w.closesAt)) return feed;
  feed.window = { program: w.program, opensAt: new Date(open).toISOString(),
    closesAt: new Date(close).toISOString(), verifiedAt: new Date(verified).toISOString(), sourceURL: w.sourceURL };
  return feed;
}

export function registrationSummary(feed: AlertFeed, now = Date.now()): string {
  const w = feed.window;
  if (!w) return "Registration dates not yet confirmed in this app";
  if (now >= Date.parse(w.closesAt)) return `${w.program} registration has closed`;
  if (now >= Date.parse(w.opensAt)) return `${w.program} registration window is open`;
  return `${w.program} opens ${new Date(w.opensAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

async function requestJSON(init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(alertServiceURL, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error("The alert service is unavailable. Please try again later.");
    return await response.json().catch(() => { throw new Error("The alert service is unavailable. Please try again later."); });
  } finally { clearTimeout(timeout); }
}

export async function fetchAlertFeed(): Promise<AlertFeed> {
  return parseAlertFeed(await requestJSON());
}

export type EmailRequestState = "collecting" | "confirmation_pending" | "confirmation_sent" | "already_confirmed";
export async function requestOpeningEmail(email: string, consent: boolean, startedAt: number, id: string): Promise<EmailRequestState> {
  if (!validAlertEmail(email)) throw new Error("Enter a valid email address.");
  if (!consent) throw new Error("Please agree to the email alert before sending.");
  const now = Date.now();
  if (now - startedAt < 1000) throw new Error("Please take a moment to review the email consent.");
  if (now - startedAt > 86400000) throw new Error("Close and reopen this screen, then try again.");
  const data = await requestJSON({
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      notificationId: id,
      submittedAt: new Date(now).toISOString(),
      formStartedAt: new Date(startedAt).toISOString(),
      website: "greencardapplicationservices.com",
      sourcePage: "/ios-app/registration-alerts",
      email: email.trim().toLowerCase(), phone: "", notifyCompanyWebsite: "",
      consent: alertConsent, marketingConsent: false,
    }),
  }) as Record<string, unknown> | null;
  if (!data || data.ok !== true) throw new Error("Your request was not accepted. Please wait a minute and try again.");
  if (data.state === "confirmation_pending" || data.state === "confirmation_sent" || data.state === "already_confirmed") return data.state;
  return "collecting";
}
