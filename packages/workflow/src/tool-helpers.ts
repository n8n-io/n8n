import type { INode } from './interfaces';

const MAX_TOOL_NAME_LENGTH = 64;

/**
 * Converts a node name to a valid tool name by replacing special characters with underscores,
 * collapsing consecutive underscores into a single one, and truncating to 64 characters
 * (which is the maximum length allowed by OpenAI's API).
 */
export function nodeNameToToolName(nodeOrName: INode | string): string {
	const name = typeof nodeOrName === 'string' ? nodeOrName : nodeOrName.name;
	let toolName = name.replace(/[^a-zA-Z0-9_-]+/g, '_');

	if (toolName.length > MAX_TOOL_NAME_LENGTH) {
		toolName = toolName.slice(0, MAX_TOOL_NAME_LENGTH);
		// Remove trailing underscore or hyphen left from truncation
		toolName = toolName.replace(/[_-]+$/, '');
	}

	return toolName;
}
