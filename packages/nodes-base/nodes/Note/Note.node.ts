import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';


export class Note implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Note',
		name: 'note',
		icon: 'fa:sticky-note',
		group: ['input'],
		version: 1,
		description: 'Leave notes and organize your flow. Supports markdown.',
		defaults: {
			name: 'Note',
			color: '#FFD233',
		},
		inputs: [],
		outputs: [],
		properties: [
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				required: true,
				default: "## I'm a note \n**Double click** to edit me. [Guide](https://docs.n8n.io/workflows/workflow-notes/)",
				description: 'Content',
			},
			{
				displayName: 'top',
				name: 'top',
				type: 'number',
				required: true,
				default: 80,
				description: 'top',
			},
			{
				displayName: 'bottom',
				name: 'bottom',
				type: 'number',
				required: true,
				default: 120,
				description: 'bottom',
			},
			{
				displayName: 'right',
				name: 'right',
				type: 'number',
				required: true,
				default: 80,
				description: 'right',
			},
			{
				displayName: 'left',
				name: 'left',
				type: 'number',
				required: true,
				default: 120,
				description: 'left',
			},
		],
	};

	execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		return this.prepareOutputData(items);
	}
}
