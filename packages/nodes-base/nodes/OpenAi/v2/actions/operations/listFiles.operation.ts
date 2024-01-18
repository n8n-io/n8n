import type {
	IDataObject,
	INodeProperties,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';

import { apiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Purpose',
				name: 'purpose',
				type: 'options',
				default: 'assistants',
				description: 'Only return files with the given purpose',
				options: [
					{
						name: 'Assistants',
						value: 'assistants',
					},
					{
						name: 'Fine-Tune',
						value: 'fine-tune',
					},
				],
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['listFiles'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', i, {});
	const qs: IDataObject = {};

	if (options.purpose) {
		qs.purpose = options.purpose as string;
	}

	const { data } = await apiRequest.call(this, 'GET', '/files', { qs });

	return (data || []).map((file: IDataObject) => ({
		json: file,
		pairedItem: { item: i },
	}));
}
