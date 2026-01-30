export interface TaxConnection {
  sourceNode: string;
  sourceOutput: number;
  targetNode: string;
  targetInput: number;
}

export class TopologicalSort {
  static sort(nodeIds: string[], connections: TaxConnection[]): string[] {
    // Build adjacency list
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize
    for (const nodeId of nodeIds) {
      graph.set(nodeId, []);
      inDegree.set(nodeId, 0);
    }

    // Build graph
    for (const conn of connections) {
      graph.get(conn.sourceNode)?.push(conn.targetNode);
      inDegree.set(conn.targetNode, (inDegree.get(conn.targetNode) || 0) + 1);
    }

    // Find nodes with no incoming edges
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    // Process queue
    const sorted: string[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      sorted.push(nodeId);

      // Reduce in-degree of neighbors
      for (const neighbor of graph.get(nodeId) || []) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);

        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Check for cycles
    if (sorted.length !== nodeIds.length) {
      throw new Error('Workflow contains cycles');
    }

    return sorted;
  }
}
