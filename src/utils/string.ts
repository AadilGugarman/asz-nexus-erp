export const normalizeText = (value?: unknown): string => {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.toLowerCase().trim();
  return String(value).toLowerCase().trim();
};

export const equalsText = (a?: unknown, b?: unknown): boolean => {
  return normalizeText(a) === normalizeText(b);
};

export const includesText = (value?: unknown, query?: unknown): boolean => {
  return normalizeText(value).includes(normalizeText(query));
};
