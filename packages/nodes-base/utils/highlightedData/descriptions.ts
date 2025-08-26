import type { INodeProperties } from 'n8n-workflow';

export const autoSaveHighlightedDataProperty: INodeProperties = {
	displayName: 'Auto-save highlighted data',
	name: 'autoSaveHighlightedData',
	type: 'boolean',
	default: true,
	description:
		'Whether to automatically save <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executiondata/" target="_blank">highlighted data</a>. Defaults to true.',
};
