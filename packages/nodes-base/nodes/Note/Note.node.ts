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
				typeOptions: {
					rows: 4,
				},
				default: "## I'm a note \n**Double click** to edit me. [Guide](https://docs.n8n.io/workflows/workflow-notes/)",
				description: 'Content',
			},
			{
				displayName: 'Height',
				name: 'height',
				type: 'number',
				required: true,
				default: 160,
				description: 'Height',
			},
			{
				displayName: 'Is Sticky Editable',
				name: 'isStickyEditable',
				type: 'boolean',
				required: true,
				default: false,
				description: 'Is Sticky Editable',
			},
			{
				displayName: 'Is Default Text Changed',
				name: 'isDefaultTextChanged',
				type: 'boolean',
				required: true,
				default: false,
				description: 'Is Default Text Changed',
			},
			{
				displayName: 'Total Size',
				name: 'totalSize',
				type: 'number',
				required: true,
				default: 400,
				description: 'Total Size',
			},
			{
				displayName: 'Width',
				name: 'width',
				type: 'number',
				required: true,
				default: 240,
				description: 'Width',
			},
			{
				displayName: 'Z-Index',
				name: 'zIndex',
				type: 'number',
				required: true,
				default: -400,
				description: 'Z-Index',
			},
		],
	};

	execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		return this.prepareOutputData(items);
	}
}
