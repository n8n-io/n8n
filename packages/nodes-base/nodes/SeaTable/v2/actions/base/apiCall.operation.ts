import {
	type IDataObject,
	type INodeExecutionData,
	type INodeProperties,
	type IExecuteFunctions,
	updateDisplayOptions,
} from 'n8n-workflow';

import { seaTableApiRequest } from '../../GenericFunctions';
import type { APITypes } from '../../types';

export const properties: INodeProperties[] = [
	{
		displayName: 'HTTP Method',
		name: 'apiMethod',
		type: 'options',
		options: [
			{
				name: 'POST',
				value: 'POST',
			},
			{
				name: 'GET',
				value: 'GET',
			},
			{
				name: 'PUT',
				value: 'PUT',
			},
			{
				name: 'DELETE',
				value: 'DELETE',
			},
		],
		required: true,
		default: 'POST',
	},
	{
		displayName: 'Hint: The Authentication header is included automatically.',
		name: 'notice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'URL',
		name: 'apiEndpoint',
		type: 'string',
		required: true,
		default: '',
		placeholder: '/dtable-server/...',
		description:
			'The URL has to start with /dtable-server/ or /dtable-db/. All possible requests can be found at the SeaTable API Reference at https://api.seatable.io Please be aware that only request from the section Base Operations that use an Base-Token for the authentication are allowed to use.',
	},
	{
		displayName: 'Query String Parameters',
		name: 'apiParams',
		type: 'fixedCollection',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		description: 'These params will be URL-encoded and appended to the URL when making the request',
		options: [
			{
				name: 'apiParamsValues',
				displayName: 'Parameters',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Body',
		name: 'apiBody',
		type: 'json',
		typeOptions: {
			rows: 4,
		},
		default: '',
		description:
			'Only valid JSON is accepted. n8n will pass anything you enter as raw input. For example, {"foo", "bar"} is perfectly valid. Of cause you can use variables from n8n inside your JSON.',
	},
	{
		displayName: 'Response Object Parameter Name',
		name: 'responseObjectName',
		type: 'string',
		placeholder: 'Leave it empty or use a value like "rows", "metadata", "views" etc.',
		default: '',
		description:
			'When using the SeaTable API, you can specify a parameter to retrieve either the entire array of objects or a specific object within it. This allows you to choose whether to fetch the complete output or only the object related to the provided parameter.',
	},
];

const displayOptions = {
	show: {
		resource: ['base'],
		operation: ['apiCall'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const apiMethod = this.getNodeParameter('apiMethod', index) as APITypes;
	const apiEndpoint = this.getNodeParameter('apiEndpoint', index) as APITypes;
	const responseObjectName = this.getNodeParameter('responseObjectName', index) as string;

	// body params
	const apiBody = this.getNodeParameter('apiBody', index) as any;

	// query params
	const apiParams: IDataObject = {};
	const params = this.getNodeParameter('apiParams.apiParamsValues', index, []) as any;
	for (const param of params) {
		apiParams[`${param.key}`] = param.value;
	}

	const responseData = await seaTableApiRequest.call(
		this,
		{},
		apiMethod,
		apiEndpoint,
		apiBody,
		apiParams,
	);

	if (responseObjectName) {
		return this.helpers.returnJsonArray(responseData[responseObjectName] as IDataObject[]);
	} else {
		return this.helpers.returnJsonArray(responseData as IDataObject[]);
	}
}
