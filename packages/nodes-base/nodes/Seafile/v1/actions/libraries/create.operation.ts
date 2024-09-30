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
		displayName: 'Library Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of SeaTable library to create',
	},
	{
		displayName: 'Password',
		name: 'pw',
		type: 'string',
		placeholder: '',
		default: '',
		description: 'Password to create a password protected library',
		hint: 'This password is only used in the webinterface of Seafile. The API endpoints (and this n8n node) will work also with protected libraries.',
	},
];

const displayOptions = {
	show: {
		resource: ['libraries'],
		operation: ['create'],
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
	const name = this.getNodeParameter('name', index) as string;
	const pw = this.getNodeParameter('pw', index) as string;

	const options: IRequestOptions = {
		method: 'POST',
		body: {
			name: name,
			passwd: pw,
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
