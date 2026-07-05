// packages/utils/src/locale-text.ts
// Resolves a MultiLangContent field (or a plain string, for callers still on
// the old flattened shape) to the string for the requested locale, falling
// back to English then to whatever value exists so a card never renders blank.

export interface MultiLangContentLike {
  ku?: string;
  ar?: string;
  en?: string;
  zh?: string;
}

export function resolveLocaleText(
  content: MultiLangContentLike | string | undefined | null,
  locale: string
): string {
  if (!content) return '';
  if (typeof content === 'string') return content;

  const key = locale as keyof MultiLangContentLike;
  return (
    content[key] ||
    content.en ||
    content.ku ||
    content.ar ||
    content.zh ||
    ''
  );
}
