import {
	type IDataObject,
	type INodeExecutionData,
	type INodeProperties,
	type IExecuteFunctions,
	IRequestOptions,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

export const properties: INodeProperties[] = [
	{
		displayName: 'Library Type',
		name: 'type',
		type: 'options',
		options: [
			{
				name: 'My Libraries',
				value: 'mine',
			},
			{
				name: 'Shared With Me',
				value: 'shared',
			},
			{
				name: 'Group Libraries',
				value: 'group',
			},
			{
				name: 'Organization Libraries',
				value: 'org',
			},
		],
		required: true,
		default: 'mine',
		description: 'The type of SeaTable library that should be listed',
	},
	{
		displayName: 'Search by Name',
		name: 'nameContains',
		type: 'string',
		placeholder: '',
		default: '',
		hint: 'This is a case-insensitive substring match search (e.g. `Voi` will find `Invoices`)',
	},
];

const displayOptions = {
	show: {
		resource: ['libraries'],
		operation: ['list'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('seafileApi');
	const baseURL = credentials?.domain;

	// get parameters
	const type = this.getNodeParameter('type', index) as string;
	const nameContains = this.getNodeParameter('nameContains', index) as string;

	const options: IRequestOptions = {
		method: 'GET',
		qs: {
			type: type,
			nameContains: nameContains,
		},
		uri: `${baseURL}/api2/repos/` as string,
		json: true,
	};

	const responseData = await this.helpers.requestWithAuthentication.call(
		this,
		'seafileApi',
		options,
	);

	return this.helpers.returnJsonArray(responseData as IDataObject[]);
}
