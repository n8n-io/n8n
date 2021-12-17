import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class Note implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Note',
		name: 'Note',
		icon: 'fa:sticky-note',
		group: ['transform'],
		version: 1,
		subtitle: '',
		description: 'Leave notes and organize your flow. Supports markdown.',
		defaults: {
			name: 'Note',
			color: '#08c7fb',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	};

	// @ts-ignore
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return [this.helpers.returnJsonArray([])];
	}
}
