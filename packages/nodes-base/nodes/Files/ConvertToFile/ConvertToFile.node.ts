import type { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';

export class ConvertToFile implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Convert to File',
		name: 'convertToFile',
		icon: 'fa:file-import',
		group: ['input'],
		version: 1,
		description: 'Convert JSON data to binary data',
		defaults: {
			name: 'Convert to File',
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
