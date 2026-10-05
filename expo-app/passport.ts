import { Draft, Person, parseDate, today } from "./models";

export type PassportReading = {
  first: string;
  middle: string;
  last: string;
  dob: string;
  sex: string;
  number: string;
  issuer: string;
  nationality: string;
  expires: string;
};

// ICAO Doc 9303, TD3: two lines of 44 characters. Check digits detect OCR
// mistakes; they do not authenticate the document or validate eligibility.
export function mrzCheckDigit(value: string): string {
  const total = [...value].reduce((sum, c, i) => {
    const n =
      c === "<" ? 0 : /[0-9]/.test(c) ? Number(c) : c.charCodeAt(0) - 55;
    return sum + n * [7, 3, 1][i % 3];
  }, 0);
  return String(total % 10);
}
const digits = (s: string) => s.replace(/[OQ]/g, "0").replace(/[IL]/g, "1");
const countryLetters = (s: string) => s.replace(/0/g, "O").replace(/1/g, "I");
const words = (s: string) => s.replace(/</g, " ").trim().replace(/ +/g, " ");

function mrzDate(s: string, birth: boolean, now: string): string | null {
  if (!/^\d{6}$/.test(s)) return null;
  const currentYear = Number(now.slice(0, 4));
  const candidates = [1900, 2000, 2100]
    .map(
      (c) => `${c + Number(s.slice(0, 2))}-${s.slice(2, 4)}-${s.slice(4, 6)}`,
    )
    .filter((d) => parseDate(d));
  if (birth)
    return (
      candidates
        .filter((d) => d <= now)
        .sort()
        .at(-1) ?? null
    );
  return (
    candidates.sort(
      (a, b) =>
        Math.abs(Number(a.slice(0, 4)) - currentYear) -
        Math.abs(Number(b.slice(0, 4)) - currentYear),
    )[0] ?? null
  );
}

function readPair(
  first: string,
  rawSecond: string,
  now: string,
): PassportReading | null {
  first =
    first.slice(0, 2) + countryLetters(first.slice(2, 5)) + first.slice(5);
  if (!/^P[A-Z<][A-Z<]{3}[A-Z<]{39}$/.test(first) || rawSecond.length !== 44)
    return null;
  // Only correct O/0 and I/1 in positions which must be numeric. Never guess
  // letters/digits in names or document numbers; reject if checks fail.
  const s =
    rawSecond.slice(0, 9) +
    digits(rawSecond[9]) +
    countryLetters(rawSecond.slice(10, 13)) +
    digits(rawSecond.slice(13, 20)) +
    rawSecond[20] +
    digits(rawSecond.slice(21, 28)) +
    rawSecond.slice(28, 42) +
    digits(rawSecond.slice(42));
  if (!/^[A-Z0-9<]{9}\d[A-Z<]{3}\d{7}[MFX<]\d{7}[A-Z0-9<]{14}[\d<]\d$/.test(s))
    return null;
  if (
    mrzCheckDigit(s.slice(0, 9)) !== s[9] ||
    mrzCheckDigit(s.slice(13, 19)) !== s[19] ||
    mrzCheckDigit(s.slice(21, 27)) !== s[27] ||
    (s[42] === "<"
      ? !/^<{14}$/.test(s.slice(28, 42))
      : mrzCheckDigit(s.slice(28, 42)) !== s[42]) ||
    mrzCheckDigit(s.slice(0, 10) + s.slice(13, 20) + s.slice(21, 43)) !== s[43]
  )
    return null;
  const names = first.slice(5).split("<<");
  if (names.length < 2) return null;
  const last = words(names[0]);
  const given = words(names.slice(1).join("<<")).split(" ").filter(Boolean);
  const dob = mrzDate(s.slice(13, 19), true, now);
  const expires = mrzDate(s.slice(21, 27), false, now);
  const number = s.slice(0, 9).replace(/<+$/, "");
  if (
    (!last && !given.length) ||
    !dob ||
    !expires ||
    !number ||
    number.includes("<")
  )
    return null;
  return {
    first: given[0] ?? "",
    middle: given.slice(1).join(" "),
    last,
    dob,
    sex: s[20] === "M" ? "Male" : s[20] === "F" ? "Female" : "",
    number,
    issuer: first.slice(2, 5).replace(/</g, ""),
    nationality: s.slice(10, 13).replace(/</g, ""),
    expires,
  };
}

export function parsePassport(lines: string[], now = today()): PassportReading {
  const candidates = [
    ...new Set(
      lines
        .flatMap((line) => {
          const value = line
            .toUpperCase()
            .replace(/[«‹]/g, "<")
            .replace(/\s/g, "");
          return value.length === 88
            ? [value.slice(0, 44), value.slice(44)]
            : [value];
        })
        .filter((line) => line.length === 44),
    ),
  ];
  const results = new Map<string, PassportReading>();
  for (const first of candidates.filter((s) => s.startsWith("P"))) {
    for (const second of candidates) {
      const result = readPair(first, second, now);
      if (result) results.set(JSON.stringify(result), result);
    }
  }
  if (results.size > 1)
    throw new Error(
      "More than one passport was detected. Choose a photo of just one identity page.",
    );
  const result = [...results.values()][0];
  if (!result)
    throw new Error(
      "We couldn’t read both passport lines reliably. Include the two lines of letters, numbers and < symbols at the bottom, avoid glare, and try again. You can also enter your details manually.",
    );
  return result;
}

export function applyPassport(draft: Draft, reading: PassportReading): Draft {
  const primary: Person = {
    ...draft.people[0],
    first: reading.first.trim(),
    middle: reading.middle.trim(),
    last: reading.last.trim(),
    noFirst: !reading.first.trim(),
    noLast: !reading.last.trim(),
    dob: reading.dob,
    sex: reading.sex || draft.people[0].sex,
  };
  return {
    ...draft,
    started: true,
    reviewed: false,
    step: 0,
    detailsSection: "personal",
    people: [primary, ...draft.people.slice(1)],
    passport: {
      number: reading.number,
      issuer: reading.issuer,
      nationality: reading.nationality,
      expires: reading.expires,
    },
    // A scan does not prove required page scans, eligibility or portrait readiness.
  };
}
