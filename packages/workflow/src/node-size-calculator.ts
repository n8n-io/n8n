import type { ComputedHandle } from './crdt-workflow-helpers';

/**
 * Node size calculation for CRDT workflow documents.
 *
 * This calculates node dimensions based on handle counts and runs in both
 * server and worker mode to ensure consistent layouts across all clients.
 *
 * Size is computed from handle counts (which are already server-computed)
 * and stored in the CRDT document alongside the handles.
 */

// Constants matching packages/frontend/editor-ui/src/app/utils/nodeViewUtils.ts
const GRID_SIZE = 16;
const DEFAULT_NODE_SIZE: [number, number] = [GRID_SIZE * 6, GRID_SIZE * 6]; // [96, 96]
const CONFIGURATION_NODE_RADIUS = (GRID_SIZE * 5) / 2; // 40
const CONFIGURATION_NODE_SIZE: [number, number] = [
	CONFIGURATION_NODE_RADIUS * 2,
	CONFIGURATION_NODE_RADIUS * 2,
]; // [80, 80]
const NODE_MIN_INPUT_ITEMS_COUNT = 4;

export interface NodeSizeInputs {
	inputs: ComputedHandle[];
	outputs: ComputedHandle[];
}

/**
 * Calculate node dimensions based on handle counts.
 *
 * Algorithm:
 * 1. Height = base height + extra height per additional main handle
 * 2. Width depends on node type:
 *    - Configuration nodes (non-main outputs): 80px
 *    - Configurable nodes (non-main inputs): Variable based on port count
 *    - Default nodes: 96px
 *
 * @param inputs - Array of computed input handles
 * @param outputs - Array of computed output handles
 * @param isExperimentalNdvActive - Feature flag for experimental NDV (defaults to false)
 * @returns Calculated node dimensions { width, height }
 */
export function calculateNodeSize(
	{ inputs, outputs }: NodeSizeInputs,
	isExperimentalNdvActive: boolean = false,
): { width: number; height: number } {
	const mainInputCount = inputs.filter((h) => h.type === 'main').length;
	const mainOutputCount = outputs.filter((h) => h.type === 'main').length;
	const nonMainInputCount = inputs.filter((h) => h.type !== 'main').length;
	const nonMainOutputCount = outputs.filter((h) => h.type !== 'main').length;

	// isConfiguration: has non-main OUTPUTS (provides config to parents)
	// These are typically "sub-nodes" like AI tools that connect to parent nodes
	const isConfiguration = nonMainOutputCount > 0;

	// isConfigurable: has non-main INPUTS (receives config from children)
	// These are typically "parent nodes" like AI agents that receive tools/models
	const isConfigurable = nonMainInputCount > 0;

	// Height calculation: base height + extra for each main handle beyond 2
	const maxVerticalHandles = Math.max(mainInputCount, mainOutputCount, 1);
	const height = DEFAULT_NODE_SIZE[1] + Math.max(0, maxVerticalHandles - 2) * GRID_SIZE * 2;

	// Width scale factor for experimental NDV
	const widthScale = isExperimentalNdvActive ? 1.5 : 1;

	// Configurable nodes (AI parent nodes with non-main inputs)
	if (isConfigurable) {
		// Port count based on non-main inputs only (matches frontend nodeViewUtils.ts)
		const portCount = Math.max(NODE_MIN_INPUT_ITEMS_COUNT, nonMainInputCount);
		return {
			// Configuration node has extra width so that its centered port aligns to the grid
			width:
				(CONFIGURATION_NODE_RADIUS * 2 +
					GRID_SIZE * ((isConfiguration ? 1 : 0) + (portCount - 1) * 3)) *
				widthScale,
			height: isConfiguration ? CONFIGURATION_NODE_SIZE[1] : height,
		};
	}

	// Configuration nodes (AI sub-nodes with non-main outputs)
	if (isConfiguration) {
		return { width: CONFIGURATION_NODE_SIZE[0] * widthScale, height: CONFIGURATION_NODE_SIZE[1] };
	}

	// Default nodes
	return { width: DEFAULT_NODE_SIZE[0] * widthScale, height };
}
