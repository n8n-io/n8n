import type { INode } from './interfaces';

/**
 * Converts a node name to a valid tool name by replacing special characters with underscores
 * and collapsing consecutive underscores into a single one.
 */
export function nodeNameToToolName(nodeOrName: INode | string): string {
	const name = typeof nodeOrName === 'string' ? nodeOrName : nodeOrName.name;
	return name.replace(/[^a-zA-Z0-9_-]+/g, '_');
}
