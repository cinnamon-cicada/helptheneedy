import type { DetailsDraft } from './types';

// Limits follow the backend: posts.goal_cents is $1 to $10,000.
export const MIN_PRICE_CENTS = 100;
export const MAX_PRICE_CENTS = 1_000_000;
export const TITLE_MAX = 80;
export const DESCRIPTION_MAX = 500;
export const INSTRUCTIONS_MAX = 300;

/** "12", "$12.5", "1,250.00" → cents, without floating point. null if not a price. */
export function parsePriceToCents(input: string): number | null {
  const match = /^\$?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  const dollars = Number(match[1].replace(/,/g, ''));
  const cents = Number((match[2] ?? '').padEnd(2, '0'));
  return dollars * 100 + cents;
}

export type DetailsErrors = Partial<Record<keyof DetailsDraft, string>>;

export function validateDetails(d: DetailsDraft): DetailsErrors {
  const errors: DetailsErrors = {};
  const title = d.title.trim();
  if (!title) errors.title = 'Give your wish a title.';
  else if (title.length > TITLE_MAX) errors.title = `Use ${TITLE_MAX} characters or fewer.`;

  if (!d.price.trim()) errors.price = 'Enter an amount.';
  else {
    const cents = parsePriceToCents(d.price);
    if (cents === null) errors.price = 'Enter an amount like 12 or 12.50.';
    else if (cents < MIN_PRICE_CENTS) errors.price = 'The amount must be at least $1.';
    else if (cents > MAX_PRICE_CENTS) errors.price = 'The amount can be at most $10,000.';
  }

  if (!d.category) errors.category = 'Choose a category.';

  const description = d.description.trim();
  if (!description) errors.description = 'Say a little about your wish.';
  else if (description.length > DESCRIPTION_MAX) errors.description = `Use ${DESCRIPTION_MAX} characters or fewer.`;

  if (d.giftInstructions.trim().length > INSTRUCTIONS_MAX) {
    errors.giftInstructions = `Use ${INSTRUCTIONS_MAX} characters or fewer.`;
  }
  return errors;
}

/** Every required field is filled in and valid, so the wish can be posted. */
export function isComplete(d: DetailsDraft) {
  return Object.keys(validateDetails(d)).length === 0;
}

const REQUIRED_LABELS: [keyof DetailsDraft, string][] = [
  ['title', 'title'],
  ['price', 'price'],
  ['category', 'category'],
  ['description', 'description'],
];

/** Required fields that are still empty, for the "to post, add…" hint. */
export function missingRequired(d: DetailsDraft) {
  return REQUIRED_LABELS.filter(([key]) => (key === 'category' ? !d.category : !String(d[key]).trim())).map(
    ([, label]) => label,
  );
}

/** For a draft, empty fields are fine; only what was entered must be valid. */
export function validateDraft(d: DetailsDraft): DetailsErrors {
  const errors = validateDetails(d);
  if (!d.title.trim()) delete errors.title;
  if (!d.price.trim()) delete errors.price;
  if (!d.category) delete errors.category;
  if (!d.description.trim()) delete errors.description;
  return errors;
}

const TAG = /(^|\s)#([\p{L}\p{N}_]+)/gu;
const MENTION = /(^|\s)@([\p{L}\p{N}_]+)/gu;

export function extractHashtags(text: string) {
  return [...new Set([...text.matchAll(TAG)].map((m) => m[2].toLowerCase()))];
}

export function extractMentions(text: string) {
  return [...new Set([...text.matchAll(MENTION)].map((m) => m[2]))];
}

/** The "@partial" being typed just before the cursor, if any. */
export function mentionAtCursor(text: string, cursor: number) {
  const before = text.slice(0, cursor);
  const match = /(^|\s)@([\p{L}\p{N}_]*)$/u.exec(before);
  if (!match) return null;
  return { query: match[2], start: cursor - match[2].length - 1 };
}

/** A friend's handle: their name without spaces. */
export const handleFor = (displayName: string) => displayName.replace(/\s+/g, '');
