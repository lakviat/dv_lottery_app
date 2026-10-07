export type FormErrors = Record<string, string | undefined>;

/** Validators return errors in screen order, independent of control mount order. */
export function firstInvalidField(
  errors: FormErrors,
  registered: ReadonlySet<string>,
): string | undefined {
  return Object.keys(errors).find((id) => errors[id] && registered.has(id));
}
