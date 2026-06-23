/**
 * autoLayout.ts
 * 
 * Implements the same tree auto-layout algorithm as the desktop DBest's
 * RedistributeNodesCommand: BFS from root, distributes nodes in horizontal
 * levels (root at top, leaves at bottom).
 */

import { Node, Edge } from "@xyflow/react";

const HORIZONTAL_GAP = 200; // pixels between siblings
const VERTICAL_GAP = 120;   // pixels between levels
const ROOT_X = 50;          // starting X for the root
const ROOT_Y = 50;          // starting Y for the root

/**
 * Find the root node (node with no outgoing edges — i.e. no node feeds INTO it as target).
 * In DBest, the root is the top of the query tree (e.g. the final operator).
 * It's the node that has no edges where it appears as a "source" (i.e. no parent feeding it).
 *
 * Actually in React Flow the edges go child → parent (source=child, target=parent).
 * So the ROOT is the node that appears as a TARGET of edges but NEVER as a SOURCE.
 * Or alternatively, the node with no outgoing edges where it's a source.
 *
 * In our DBest canvas convention: edges go from table/operator → parent operator.
 * The root is the node that is NOT a source of any edge (nobody depends on it).
 */
export function findRootNode(nodes: Node[], edges: Edge[]): string | null {
  // nodes that appear as source of at least one edge
  const sourcesOfEdges = new Set(edges.map((e) => e.source));
  // The root is the node that is a TARGET somewhere but NOT a SOURCE anywhere
  // In DBest: leaves (tables) are sources, root is the final operation (never a source of another edge)
  const candidates = nodes.filter((n) => !sourcesOfEdges.has(n.id));
  if (candidates.length === 0) return nodes[0]?.id ?? null;
  if (candidates.length === 1) return candidates[0].id;
  // If multiple candidates, pick the one that appears as a target most (most connected)
  const targetCount = new Map<string, number>();
  edges.forEach((e) => targetCount.set(e.target, (targetCount.get(e.target) ?? 0) + 1));
  return candidates.sort((a, b) => (targetCount.get(b.id) ?? 0) - (targetCount.get(a.id) ?? 0))[0].id;
}

/**
 * Compute new positions for all nodes in a subtree using BFS tree layout.
 * Root at top-center, children spread horizontally.
 *
 * Returns a map: nodeId → { x, y }
 */
export function computeTreeLayout(
  rootId: string,
  nodes: Node[],
  edges: Edge[]
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();

  // Build parent-children map (edge: source=child → target=parent, so children of X = edges where target=X, giving source as child)
  const childrenOf = new Map<string, string[]>(); // parentId → [childId, ...]
  edges.forEach((e) => {
    const children = childrenOf.get(e.target) ?? [];
    children.push(e.source);
    childrenOf.set(e.target, children);
  });

  // BFS to determine level of each node and collect by level
  const levels: string[][] = [];
  const visited = new Set<string>();
  let currentLevel = [rootId];

  while (currentLevel.length > 0) {
    levels.push(currentLevel);
    currentLevel.forEach((id) => visited.add(id));
    const nextLevel: string[] = [];
    currentLevel.forEach((id) => {
      const children = childrenOf.get(id) ?? [];
      children.forEach((childId) => {
        if (!visited.has(childId)) nextLevel.push(childId);
      });
    });
    currentLevel = nextLevel;
  }

  // Assign positions: each level gets a Y, nodes in level spread horizontally
  levels.forEach((level, levelIndex) => {
    const totalWidth = (level.length - 1) * HORIZONTAL_GAP;
    const startX = ROOT_X - totalWidth / 2;
    level.forEach((nodeId, colIndex) => {
      result.set(nodeId, {
        x: startX + colIndex * HORIZONTAL_GAP,
        y: ROOT_Y + levelIndex * VERTICAL_GAP,
      });
    });
  });

  // Include unvisited nodes (disconnected) after the tree
  nodes.forEach((n) => {
    if (!result.has(n.id)) {
      result.set(n.id, { x: n.position.x, y: n.position.y });
    }
  });

  return result;
}
