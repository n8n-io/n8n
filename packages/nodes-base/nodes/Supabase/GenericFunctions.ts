import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject, INodeProperties, NodeApiError,
} from 'n8n-workflow';

export async function superbaseApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, headers: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('supabaseApi') as { host: string, serviceRole: string };

	const options: OptionsWithUri = {
		headers: {
			apikey: credentials.serviceRole,
			Prefer: 'return=representation',
		},
		method,
		qs,
		body,
		uri: uri || `${credentials.host}/rest/v1${resource}`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		//@ts-ignore
		return this.helpers?.request(options);

	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

// export const getWhereConditions = (
// 	displayName: string,
// 	operations: string[],
// 	placeholder: string,
// ): INodeProperties[] => {
// 	return [{
// 		displayName,
// 		name: 'keys',
// 		type: 'fixedCollection',
// 		placeholder,
// 		typeOptions: {
// 			multipleValues: true,
// 		},
// 		displayOptions: {
// 			show: {
// 				resource: [
// 					'row',
// 				],
// 				operation: operations,
// 			},
// 		},
// 		default: {},
// 		options: [
// 			{
// 				name: 'keys',
// 				displayName: 'Key',
// 				values: [
// 					{
// 						displayName: 'Key Name',
// 						name: 'keyName',
// 						type: 'string',
// 						default: '',
// 					},
// 					{
// 						displayName: 'Condition',
// 						name: 'condition',
// 						type: 'options',
// 						options: [
// 							{
// 								name: 'Equals',
// 								value: 'eq',
// 							},
// 							{
// 								name: 'Greater Than',
// 								value: 'gt',
// 							},
// 							{
// 								name: 'Greater Than Equal',
// 								value: 'gte',
// 							},
// 							{
// 								name: 'Less than',
// 								value: 'lt',
// 							},
// 							{
// 								name: 'Less Than or Equal',
// 								value: 'lte',
// 							},
// 							{
// 								name: 'Not Equal',
// 								value: '<>',
// 							},
// 							{
// 								name: 'LIKE operator',
// 								value: 'like',
// 								description: 'use * in place of %',
// 							},
// 							{
// 								name: 'ILIKE operator',
// 								value: 'ilike',
// 								description: 'use * in place of %',
// 							},
// 							{
// 								name: 'Is',
// 								value: 'is',
// 								description: 'Checking for exact equality (null,true,false,unknown)',
// 							},
// 							{
// 								name: 'Full-Text',
// 								value: '@@',
// 							},
// 						],
// 						default: '',
// 					},
// 					{
// 						displayName: 'Key Value',
// 						name: 'keyValue',
// 						type: 'string',
// 						default: '',
// 					},
// 				],
// 			},
// 		],
// 	}];
// };

export function getFilters(
	resources: string[],
	operations: string[]): INodeProperties[] {
	return [
		{
			displayName: 'Filter',
			name: 'filterType',
			type: 'options',
			options: [
				{
					name: 'None',
					value: 'none',
				},
				{
					name: 'Build Manually',
					value: 'manual',
				},
				{
					name: 'String',
					value: 'string',
				},
			],
			displayOptions: {
				show: {
					resource: resources,
					operation: operations,
				},
			},
			default: 'none',
		},
		{
			displayName: 'Must Match',
			name: 'matchType',
			type: 'options',
			options: [
				{
					name: 'Any filter',
					value: 'anyFilter',
				},
				{
					name: 'All Filters',
					value: 'allFilters',
				},
			],
			displayOptions: {
				show: {
					resource: resources,
					operation: operations,
					filterType: [
						'manual',
					],
				},
			},
			default: 'anyFilter',
		},
		{
			displayName: 'Filters',
			name: 'filters',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			displayOptions: {
				show: {
					resource: resources,
					operation: operations,
					filterType: [
						'manual',
					],
				},
			},
			default: '',
			placeholder: 'Add Condition',
			options: [
				{
					displayName: 'Conditions',
					name: 'conditions',
					values: [
						{
							displayName: 'Key Name',
							name: 'keyName',
							type: 'string',
							default: '',
						},
						{
							displayName: 'Condition',
							name: 'condition',
							type: 'options',
							options: [
								{
									name: 'Equals',
									value: 'eq',
								},
								{
									name: 'Greater Than',
									value: 'gt',
								},
								{
									name: 'Greater Than Equal',
									value: 'gte',
								},
								{
									name: 'Less than',
									value: 'lt',
								},
								{
									name: 'Less Than or Equal',
									value: 'lte',
								},
								{
									name: 'Not Equal',
									value: '<>',
								},
								{
									name: 'LIKE operator',
									value: 'like',
									description: 'use * in place of %',
								},
								{
									name: 'ILIKE operator',
									value: 'ilike',
									description: 'use * in place of %',
								},
								{
									name: 'Is',
									value: 'is',
									description: 'Checking for exact equality (null,true,false,unknown)',
								},
								{
									name: 'Full-Text',
									value: '@@',
								},
							],
							default: '',
						},
						{
							displayName: 'Key Value',
							name: 'keyValue',
							type: 'string',
							default: '',
						},
					],
				},
			],
		},
		{
			displayName: 'See <a href="https://postgrest.org/en/v9.0/api.html#horizontal-filtering-rows" target="_blank">PostgREST guide</a> to creating filters',
			name: 'jsonNotice',
			type: 'notice',
			displayOptions: {
				show: {
					resource: resources,
					operation: operations,
					filterType: [
						'string',
					],
				},
			},
			default: '',
		},
		{
			displayName: 'Filters (String)',
			name: 'filterString',
			type: 'string',
			typeOptions: {
				alwaysOpenEditWindow: true,
			},
			displayOptions: {
				show: {
					resource: resources,
					operation: operations,
					filterType: [
						'string',
					],
				},
			},
			default: '',
			description: '',
		},
	];
}