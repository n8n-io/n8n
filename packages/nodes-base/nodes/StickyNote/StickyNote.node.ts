import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class StickyNote implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sticky Note',
		name: 'stickyNote',
		icon: 'fa:sticky-note',
		group: ['input'],
		version: 1,
		description: 'Make your workflow easier to understand',
		defaults: {
			name: 'Sticky Note',
			color: '#FFD233',
		},

		inputs: [],

		outputs: [],
		properties: [
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default:
					"## I'm a note \n**Double click** to edit me. [Guide](https://docs.n8n.io/workflows/sticky-notes/)",
			},
			{
				displayName: 'Height',
				name: 'height',
				type: 'number',
				required: true,
				default: 160,
			},
			{
				displayName: 'Width',
				name: 'width',
				type: 'number',
				required: true,
				default: 240,
			},
			{
				displayName: 'Color',
				name: 'color',

				type: 'number',
				required: true,
				default: 1,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		return [items];
	}
}
