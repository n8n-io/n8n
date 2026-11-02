import { isRecord } from '@n8n/utils/is-record';

import { AGENT_LANGCHAIN_NODE_TYPE } from './constants';
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

/** Keep Tool Availability rules linked to their sources after node IDs change. */
export function remapToolAvailabilitySourceIds(
	nodes: ReadonlyArray<{ type: string; parameters?: unknown }>,
	nodeIdMap: ReadonlyMap<string, string>,
): void {
	for (const node of nodes) {
		if (node.type !== AGENT_LANGCHAIN_NODE_TYPE || !isRecord(node.parameters)) continue;

		const availability = node.parameters.toolAvailability;
		if (!isRecord(availability) || !Array.isArray(availability.rules)) continue;

		for (const rule of availability.rules.filter(isRecord)) {
			if (typeof rule.sourceNodeId !== 'string') continue;
			rule.sourceNodeId = nodeIdMap.get(rule.sourceNodeId) ?? rule.sourceNodeId;
		}
	}
}
