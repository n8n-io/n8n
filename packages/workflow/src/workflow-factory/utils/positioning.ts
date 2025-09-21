/**
 * Node position interface
 */
export interface NodePosition {
	x: number;
	y: number;
}

/**
 * Calculates the position for the next node
 * Places nodes in a horizontal line with 200px spacing
 */
export function calculateNextPosition(nodeCount: number): NodePosition {
	return {
		x: nodeCount * 200,
		y: 0,
	};
}
