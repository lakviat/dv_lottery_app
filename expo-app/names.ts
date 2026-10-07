type NameFields = { first: string; middle: string; last: string };

/** Keep every name token when a document supplies no separate family name. */
export function canonicalPersonName(name: NameFields): NameFields & {
  oneLegalName: boolean;
} {
  const first = name.first.trim();
  const middle = name.middle.trim();
  const last = name.last.trim();
  if (!last) {
    const fullName = [first, middle].filter(Boolean).join(" ");
    return { first: "", middle: "", last: fullName, oneLegalName: !!fullName };
  }
  return { first, middle, last, oneLegalName: !first && !middle };
}
