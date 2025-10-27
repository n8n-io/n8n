import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { contactRLC } from '../../descriptions';
import { contactFields } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

export const properties: INodeProperties[] = [
	contactRLC,
	{
		displayName: 'Output',
		name: 'output',
		type: 'options',
		default: 'simple',
		options: [
			{
				name: 'Simplified',
				value: 'simple',
			},
			{
				name: 'Raw',
				value: 'raw',
			},
			{
				name: 'Select Included Fields',
				value: 'fields',
			},
		],
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'multiOptions',
		description: 'The fields to add to the output',
		displayOptions: {
			show: {
				output: ['fields'],
			},
		},
		options: contactFields,
		default: [],
	},
];

const displayOptions = {
	show: {
		resource: ['contact'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number) {
	const qs: IDataObject = {};

	const contactId = this.getNodeParameter('contactId', index, undefined, {
		extractValue: true,
	}) as string;

	const output = this.getNodeParameter('output', index) as string;

	if (output === 'fields') {
		const fields = this.getNodeParameter('fields', index) as string[];
		qs.$select = fields.join(',');
	}

	if (output === 'simple') {
		qs.$select = 'id,displayName,emailAddresses,businessPhones,mobilePhone';
	}

	const responseData = await microsoftApiRequest.call(
		this,
		'GET',
		`/contacts/${contactId}`,
		undefined,
		qs,
	);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject),
		{ itemData: { item: index } },
	);

	return executionData;
}
