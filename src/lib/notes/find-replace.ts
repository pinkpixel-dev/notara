export interface FindMatch {
  start: number;
  end: number;
}

export interface ReplaceMatchResult {
  content: string;
  replacement: FindMatch;
  nextSearchFrom: number;
}

export interface ReplaceAllResult {
  content: string;
  count: number;
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const findLiteralMatches = (content: string, query: string): FindMatch[] => {
  if (!query) {
    return [];
  }

  const expression = new RegExp(escapeRegExp(query), 'giu');
  return Array.from(content.matchAll(expression), (match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));
};

export const stepMatchIndex = (
  currentIndex: number,
  matchCount: number,
  direction: 1 | -1
): number => {
  if (matchCount === 0) {
    return -1;
  }

  if (currentIndex < 0 || currentIndex >= matchCount) {
    return direction === 1 ? 0 : matchCount - 1;
  }

  return (currentIndex + direction + matchCount) % matchCount;
};

export const matchIndexAtOrAfter = (matches: FindMatch[], offset: number): number => {
  if (matches.length === 0) {
    return -1;
  }

  const safeOffset = Math.max(0, offset);
  const containingIndex = matches.findIndex(
    (match) => match.start <= safeOffset && safeOffset < match.end
  );
  if (containingIndex >= 0) {
    return containingIndex;
  }

  const nextIndex = matches.findIndex((match) => match.start >= safeOffset);
  return nextIndex >= 0 ? nextIndex : 0;
};

export const replaceLiteralMatch = (
  content: string,
  match: FindMatch,
  replacement: string
): ReplaceMatchResult => {
  const nextSearchFrom = match.start + replacement.length;
  return {
    content: `${content.slice(0, match.start)}${replacement}${content.slice(match.end)}`,
    replacement: { start: match.start, end: nextSearchFrom },
    nextSearchFrom,
  };
};

export const replaceAllLiteralMatches = (
  content: string,
  matches: FindMatch[],
  replacement: string
): ReplaceAllResult => {
  if (matches.length === 0) {
    return { content, count: 0 };
  }

  const parts: string[] = [];
  let cursor = 0;
  for (const match of matches) {
    parts.push(content.slice(cursor, match.start), replacement);
    cursor = match.end;
  }
  parts.push(content.slice(cursor));

  return { content: parts.join(''), count: matches.length };
};
