import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { contactFields } from '../../descriptions';
import { prepareContactFields } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

export const properties: INodeProperties[] = [
	{
		displayName: 'First name',
		name: 'givenName',
		type: 'string',
		default: '',
		required: true,
	},
	{
		displayName: 'Last name',
		name: 'surname',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		options: contactFields,
	},
];

const displayOptions = {
	show: {
		resource: ['contact'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number) {
	const additionalFields = this.getNodeParameter('additionalFields', index);
	const givenName = this.getNodeParameter('givenName', index) as string;
	const surname = this.getNodeParameter('surname', index) as string;

	const body: IDataObject = {
		givenName,
		...prepareContactFields(additionalFields),
	};

	if (surname) {
		body.surname = surname;
	}

	const responseData = await microsoftApiRequest.call(this, 'POST', '/contacts', index, body);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject),
		{ itemData: { item: index } },
	);

	return executionData;
}
