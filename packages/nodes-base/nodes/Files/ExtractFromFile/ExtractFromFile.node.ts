import type { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';

export class ExtractFromFile implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Extract From File',
		name: 'extractFromFile',
		icon: 'fa:file-export',
		group: ['input'],
		version: 1,
		description: 'Convert binary data to JSON',
		defaults: {
			name: 'Extract From File',
			color: '#999999',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	};

	async execute(this: IExecuteFunctions) {
		return [[]];
	}
}
