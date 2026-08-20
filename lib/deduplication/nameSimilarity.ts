/**
 * Fuzzy name matching algorithms for duplicate detection.
 * Pure TypeScript — no external dependencies.
 * All functions return 0–100 scores.
 */

// ─── Levenshtein Distance ────────────────────────────────────────────────────

/**
 * Compute the Levenshtein edit distance between two strings.
 * Uses a space-optimized single-row DP approach.
 */
export function levenshteinDistance(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  let curr = new Array(lb + 1).fill(0);

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost  // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[lb];
}

/**
 * Levenshtein similarity as a 0–100 score.
 */
export function levenshteinSimilarity(a: string, b: string): number {
  if (!a && !b) return 100;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  const dist = levenshteinDistance(a, b);
  return Math.round((1 - dist / maxLen) * 100);
}

// ─── Jaro-Winkler ────────────────────────────────────────────────────────────

/**
 * Jaro similarity between two strings.
 */
function jaroSimilarity(s1: string, s2: string): number {
  if (!s1 && !s2) return 1;
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;

  const len1 = s1.length;
  const len2 = s2.length;

  const matchDistance = Math.max(Math.floor(Math.max(len1, len2) / 2) - 1, 0);

  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (
    matches / len1 +
    matches / len2 +
    (matches - transpositions / 2) / matches
  ) / 3;

  return jaro;
}

/**
 * Jaro-Winkler similarity with prefix bonus (default p=0.1, max prefix=4).
 * Returns 0–100 score.
 */
export function jaroWinklerSimilarity(a: string, b: string): number {
  if (!a && !b) return 100;
  if (!a || !b) return 0;
  if (a === b) return 100;

  const jaro = jaroSimilarity(a, b);

  // Common prefix (up to 4 characters)
  const prefixLen = Math.min(4, Math.min(a.length, b.length));
  let commonPrefix = 0;
  for (let i = 0; i < prefixLen; i++) {
    if (a[i] === b[i]) commonPrefix++;
    else break;
  }

  const winkler = jaro + commonPrefix * 0.1 * (1 - jaro);
  return Math.round(Math.min(1, winkler) * 100);
}

// ─── Token-Based Similarity ──────────────────────────────────────────────────

/**
 * Tokenize a string into sorted word set.
 */
function tokenize(s: string): string[] {
  return s.split(/\s+/).filter(Boolean).sort();
}

/**
 * Jaccard token similarity: |intersection| / |union|
 * Returns 0–100 score.
 */
export function tokenSimilarity(a: string, b: string): number {
  if (!a && !b) return 100;
  if (!a || !b) return 0;

  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));

  if (tokensA.size === 0 && tokensB.size === 0) return 100;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }

  const union = tokensA.size + tokensB.size - intersection;
  if (union === 0) return 100;

  return Math.round((intersection / union) * 100);
}

/**
 * Token-set ratio: sort tokens, join, then Levenshtein on the result.
 * Better for handling word order differences.
 * Returns 0–100 score.
 */
export function tokenSetSimilarity(a: string, b: string): number {
  if (!a && !b) return 100;
  if (!a || !b) return 0;

  const sortedA = tokenize(a).join(" ");
  const sortedB = tokenize(b).join(" ");

  return levenshteinSimilarity(sortedA, sortedB);
}

/**
 * Bigram (character pair) similarity.
 * Returns 0–100 score.
 */
export function bigramSimilarity(a: string, b: string): number {
  if (!a && !b) return 100;
  if (!a || !b) return 0;
  if (a === b) return 100;

  const bigramsOf = (s: string): Map<string, number> => {
    const map = new Map<string, number>();
    const padded = " " + s + " ";
    for (let i = 0; i < padded.length - 1; i++) {
      const bg = padded.substring(i, i + 2);
      map.set(bg, (map.get(bg) || 0) + 1);
    }
    return map;
  };

  const aBigrams = bigramsOf(a);
  const bBigrams = bigramsOf(b);

  let intersection = 0;
  for (const [bg, count] of aBigrams) {
    const bCount = bBigrams.get(bg);
    if (bCount) {
      intersection += Math.min(count, bCount);
    }
  }

  const total = aBigrams.size + bBigrams.size;
  if (total === 0) return 100;

  // Dice coefficient
  return Math.round((2 * intersection / (aBigrams.size + bBigrams.size)) * 100);
}

// ─── Combined Name Similarity ────────────────────────────────────────────────

/**
 * Combined name similarity using weighted best-of multiple algorithms.
 * Returns 0–100 score.
 *
 * We use the maximum of the algorithms rather than average,
 * because a high score on any one algorithm is a strong signal.
 */
export function combinedNameSimilarity(a: string, b: string): number {
  if (!a && !b) return 100;
  if (!a || !b) return 0;
  if (a === b) return 100;

  const scores = [
    levenshteinSimilarity(a, b),
    jaroWinklerSimilarity(a, b),
    tokenSimilarity(a, b),
    tokenSetSimilarity(a, b),
    bigramSimilarity(a, b),
  ];

  // Weighted: Jaro-Winkler and token-set are most reliable for business names
  const weights = [0.15, 0.25, 0.20, 0.25, 0.15];
  let weightedSum = 0;
  let weightTotal = 0;

  for (let i = 0; i < scores.length; i++) {
    weightedSum += scores[i] * weights[i];
    weightTotal += weights[i];
  }

  return Math.round(weightedSum / weightTotal);
}
