/**
 * Connected-component clustering for duplicate groups.
 *
 * Takes scored pairs and groups them into clusters using union-find.
 * Each cluster becomes a DuplicateGroup with a selected master record.
 */

import { BusinessRecord, DuplicateGroup } from "./types";
import { computeDuplicateScore } from "./scoring";

// ─── Union-Find ──────────────────────────────────────────────────────────────

class UnionFind {
  private parent: number[];
  private rank: number[];

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // path compression
    }
    return this.parent[x];
  }

  union(x: number, y: number): void {
    const px = this.find(x);
    const py = this.find(y);
    if (px === py) return;

    // Union by rank
    if (this.rank[px] < this.rank[py]) {
      this.parent[px] = py;
    } else if (this.rank[px] > this.rank[py]) {
      this.parent[py] = px;
    } else {
      this.parent[py] = px;
      this.rank[px]++;
    }
  }
}

// ─── Clustering ──────────────────────────────────────────────────────────────

interface ScoredPair {
  i: number;
  j: number;
  score: number;
  reasons: string[];
}

/**
 * Cluster records into duplicate groups.
 *
 * @param records - All business records
 * @param candidatePairs - Pre-filtered candidate pairs from blocking
 * @param threshold - Minimum score to consider as duplicate (default: 60)
 * @returns Array of DuplicateGroup (only groups with 2+ members)
 */
export function clusterDuplicates(
  records: BusinessRecord[],
  candidatePairs: [number, number][],
  threshold: number = 60
): { groups: DuplicateGroup[]; scoredPairs: ScoredPair[] } {
  const n = records.length;
  const uf = new UnionFind(n);
  const scoredPairs: ScoredPair[] = [];

  // Score all candidate pairs
  for (const [i, j] of candidatePairs) {
    const result = computeDuplicateScore(records[i], records[j]);
    if (result.score >= threshold) {
      scoredPairs.push({ i, j, score: result.score, reasons: result.reasons });
      uf.union(i, j);
    }
  }

  // Build clusters from union-find
  const clusterMap = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = uf.find(i);
    const cluster = clusterMap.get(root);
    if (cluster) {
      cluster.push(i);
    } else {
      clusterMap.set(root, [i]);
    }
  }

  // Convert to DuplicateGroup (only multi-member clusters)
  let groupCounter = 1;
  const groups: DuplicateGroup[] = [];

  for (const [, members] of clusterMap) {
    if (members.length < 2) continue;

    // Select master: highest data completeness, then quality score
    const masterIdx = selectMaster(records, members);
    const groupId = `DG-${String(groupCounter).padStart(4, "0")}`;
    groupCounter++;

    // Collect all reasons from pairs in this group
    const groupReasons = new Set<string>();
    for (const sp of scoredPairs) {
      if (members.includes(sp.i) && members.includes(sp.j)) {
        for (const r of sp.reasons) groupReasons.add(r);
      }
    }

    // Average score of all pairs in group
    const groupPairScores = scoredPairs
      .filter(sp => members.includes(sp.i) && members.includes(sp.j))
      .map(sp => sp.score);
    const avgScore = groupPairScores.length > 0
      ? Math.round(groupPairScores.reduce((a, b) => a + b, 0) / groupPairScores.length)
      : 0;

    const group: DuplicateGroup = {
      groupId,
      masterRecordId: records[masterIdx].id || `record-${masterIdx}`,
      records: members.map(idx => ({
        ...records[idx],
        duplicateGroupId: groupId,
      })),
      duplicateScore: avgScore,
      reason: [...groupReasons],
    };

    groups.push(group);
  }

  return { groups, scoredPairs };
}

// ─── Master Selection ────────────────────────────────────────────────────────

/**
 * Select the best master record from a cluster.
 * Priority: highest data completeness → highest quality → most fields filled.
 */
function selectMaster(records: BusinessRecord[], members: number[]): number {
  let bestIdx = members[0];
  let bestScore = -1;

  for (const idx of members) {
    const r = records[idx];
    const score = computeRecordQuality(r);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  }

  return bestIdx;
}

/**
 * Compute a quality score for a single record.
 * Higher = more complete data.
 */
function computeRecordQuality(r: BusinessRecord): number {
  let score = 0;

  if (r.name) score += 10;
  if (r.phone) score += 20;
  if (r.phones && r.phones.length > 0) score += 5;
  if (r.website) score += 20;
  if (r.websites && r.websites.length > 0) score += 5;
  if (r.address) score += 15;
  if (r.area) score += 5;
  if (r.city) score += 5;
  if (r.latitude != null && r.longitude != null) score += 10;
  if (r.placeId) score += 10;
  if (r.rating != null) score += 5;
  if (r.reviewCount != null && r.reviewCount > 0) score += 5;
  if (r.category) score += 5;

  return score;
}

export { computeRecordQuality };
