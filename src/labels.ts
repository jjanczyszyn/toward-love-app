export type Opt<T extends string> = { value: T; label: string };

export const GENDERS: Opt<string>[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
  { value: "other", label: "Other" },
];

export const ORIENTATIONS: Opt<string>[] = [
  { value: "heterosexual", label: "Heterosexual" },
  { value: "homosexual", label: "Homosexual" },
  { value: "bisexual", label: "Bisexual" },
  { value: "pansexual", label: "Pansexual" },
  { value: "asexual", label: "Asexual" },
  { value: "other", label: "Other" },
];

export const RELATIONSHIPS: Opt<string>[] = [
  { value: "monogamous", label: "Monogamous" },
  { value: "non-monogamous", label: "Non-monogamous" },
  { value: "other", label: "Other" },
];

export const HAVE_KIDS: Opt<string>[] = [
  { value: "yes", label: "Have kids" },
  { value: "no", label: "No kids" },
];

export const WANT_KIDS: Opt<string>[] = [
  { value: "yes", label: "Want kids" },
  { value: "no", label: "Don't want kids" },
  { value: "maybe", label: "Maybe" },
  { value: "open", label: "Open to it" },
];

export function labelFor(list: Opt<string>[], value?: string | null): string {
  if (!value) return "";
  return list.find((o) => o.value === value)?.label ?? value;
}
