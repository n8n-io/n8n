import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { returnAllOrLimit } from '../../descriptions';
import { contactFields } from '../../helpers/utils';
import { microsoftApiRequest, microsoftApiRequestAllItems } from '../../transport';

export const properties: INodeProperties[] = [
	...returnAllOrLimit,
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
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		options: [
			{
				displayName: 'Filter Query',
				name: 'custom',
				type: 'string',
				default: '',
				placeholder: "e.g. displayName eq 'John Doe'",
				hint: 'Search query to filter contacts. <a href="https://learn.microsoft.com/en-us/graph/filter-query-parameter">More info</a>.',
			},
			{
				displayName: 'Email Address',
				name: 'emailAddress',
				type: 'string',
				default: '',
				description:
					'If contacts that you want to retrieve have multiple email addresses, you can enter them separated by commas',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['contact'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number) {
	let responseData;
	const qs = {} as IDataObject;

	const returnAll = this.getNodeParameter('returnAll', index);
	const filters = this.getNodeParameter('filters', index, {});
	const output = this.getNodeParameter('output', index) as string;

	if (output === 'fields') {
		const fields = this.getNodeParameter('fields', index) as string[];
		qs.$select = fields.join(',');
	}

	if (output === 'simple') {
		qs.$select = 'id,displayName,emailAddresses,businessPhones,mobilePhone';
	}

	if (Object.keys(filters).length) {
		const filterString: string[] = [];

		if (filters.emailAddress) {
			const emails = (filters.emailAddress as string)
				.split(',')
				.map((email) => `emailAddresses/any(a:a/address eq '${email.trim()}')`);
			filterString.push(emails.join(' and '));
		}

		if (filters.custom) {
			filterString.push(filters.custom as string);
		}

		if (filterString.length) {
			qs.$filter = filterString.join(' and ');
		}
	}

	const endpoint = '/contacts';

	if (returnAll) {
		responseData = await microsoftApiRequestAllItems.call(
			this,
			'value',
			'GET',
			endpoint,
			undefined,
			qs,
		);
	} else {
		qs.$top = this.getNodeParameter('limit', index);
		responseData = await microsoftApiRequest.call(this, 'GET', endpoint, undefined, qs);
		responseData = responseData.value;
	}

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject[]),
		{ itemData: { item: index } },
	);

	return executionData;
}
