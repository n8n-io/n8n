import type { NodeConnectionType } from '../../interfaces';

/**
 * Connection configuration options
 */
export interface ConnectionOptions {
	/** Output index from source node (default: 0) */
	sourceIndex?: number;
	/** Input index to target node (default: 0) */
	targetIndex?: number;
	/** Connection type (default: 'main') */
	type?: NodeConnectionType;
}

/**
 * Extended connection options that include source and target node names
 */
export interface ConnectOptions extends ConnectionOptions {
	/** Source node name */
	source: string;
	/** Target node name */
	target: string;
}
