import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

export class TextPrefix implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Text Prefix',
		name: 'textPrefix',
		icon: 'file:text.svg',
		group: ['transform'],
		version: 1,
		description: 'Adds "processed" prefix to text',
		defaults: {
			name: 'Text Prefix',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Field',
				name: 'field',
				type: 'string',
				default: 'text',
				description: 'The name of the field to add prefix to',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const field = this.getNodeParameter('field', 0) as string;

		const returnData = items.map((item) => {
			const newItem = { ...item };
			if (item.json[field] !== undefined) {
				newItem.json[field] = `processed: ${item.json[field]}`;
			}
			return newItem;
		});

		return [returnData];
	}
}
