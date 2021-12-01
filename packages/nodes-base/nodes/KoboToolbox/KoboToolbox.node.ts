import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeCredentialTestResult,
	// NodeOperationError,
} from 'n8n-workflow';

export class KoboToolbox implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'KoboToolbox',
		name: 'koboToolbox',
		icon: 'file:koboToolbox.svg',
		group: ['transform'],
		version: 1,
		description: 'Work with KoboToolbox forms and submissions',
		defaults: {
			name: 'KoboToolbox',
			color: '#64C0FF',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'koboToolboxApi',
				required: true,
				testedBy: 'koboToolboxApiCredentialTest',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Form',
						value: 'form',
					},
					{
						name: 'Submission',
						value: 'submission',
					},
					{
						name: 'Hook',
						value: 'hook',
					},
				],
				default: 'submission',
				required: true,
				description: 'Resource to consume',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'form',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve a form definition',
					},
				],
				default: 'get',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'submission',
						],
					},
				},
				options: [
					{
						name: 'Query',
						value: 'query',
						description: 'Query matching submissions',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a single submission',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a single submission',
					},
				],
				default: 'query',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'hook',
						],
					},
				},
				options: [
					{
						name: 'List',
						value: 'list',
						description: 'List all hooks on a form',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a single hook definition',
					},
					{
						name: 'Retry All',
						value: 'retry_all',
						description: 'Retry all failed attempts for a given hook',
					},
					{
						name: 'Retry One',
						value: 'retry_one',
						description: 'Retry a specific hook',
					},
					{
						name: 'Logs',
						value: 'logs',
						description: 'Get hook logs',
					},
				],
				default: 'list',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Form ID',
				name: 'asset_uid',
				type: 'string',
				required: true,
				default:'',
				description:'Form id (e.g. aSAvYreNzVEkrWg5Gdcvg)',
			},
			{
				displayName: 'Start',
				name: 'start',
				type: 'number',
				displayOptions: {
					show: {
						resource: [
							'submission',
						],
						operation: [
							'query',
						],
					},
				},
				default: 0,
				description:'Offset from the result set',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				required: false,
				displayOptions: {
					show: {
						resource: [
							'submission',
						],
						operation: [
							'query',
						],
					},
				},
				default: 1000,
				description:'Max records to return (up to 30000)',
			},
			{
				displayName: 'Submission id',
				name: 'id',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'submission',
						],
						operation: [
							'get',
							'delete',
						],
					},
				},
				default: '',
				description:'Submission id (number, e.g. 245128)',
			},
			{
				displayName: 'Hook id',
				name: 'id',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'hook',
						],
						operation: [
							'get',
							'logs',
							'retry_one',
							'retry_all',
						],
					},
				},
				default: '',
				description:'Hook id (starts with h, e.g. hVehywQ2oXPYGHJHKtqth4)',
			},
			{
				displayName: 'Hook log id',
				name: 'log_id',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'hook',
						],
						operation: [
							'retry_one',
						],
					},
				},
				default: '',
				description:'Hook log id (starts with hl, e.g. hlSbGKaUKzTVNoWEVMYbLHe)',
			},
			{
				displayName: 'Additional Options',
				name: 'additionalFields',
				type: 'collection',
				displayOptions: {
					show: {
						resource: [
							'submission',
						],
						operation: [
							'query',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Query',
						name: 'query',
						type: 'json',
						default:'',
						description:'Query for matching submissions, in MongoDB JSON format (e.g. {"_submission_time":{"$lt":"2021-10-01T01:02:03"}})',
					},
					{
						displayName: 'Fields',
						name: 'fields',
						type: 'string',
						default: '',
						description:'Comma-separated list of fields to retrieve (e.g. _submission_time,_submitted_by)',
					},
					{
						displayName: 'Sort',
						name: 'sort',
						type: 'json',
						default: '',
						description:'Sort predicates, in Mongo JSON format (e.g. {"_submission_time":1})',
					},
				],
			},
		],
	};

	methods = {
		credentialTest: {
			async koboToolboxApiCredentialTest(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<NodeCredentialTestResult> {
				const credentials = credential.data;
				try {
					const response = await this.helpers.request({
						url: `${credentials!.URL}/api/v2/assets/hash`,
						headers: {
							'Accept': 'application/json',
							'Authorization': `Token ${credentials!.token}`,
						},
						json: true,
					});
					// console.dir(response);

					if(response.hash) {
						return {
							status: 'OK',
							message: 'Connection successful!',
						};
					}
					else {
						return {
							status: 'Error',
							message: `Credentials are not valid. Response: ${response.detail}`,
						};
					}
				}
				catch(err) {
					return {
						status: 'Error',
						message: `Credentials validation failed: ${err.message}`,
					};
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// tslint:disable-next-line:no-any - it's the sad truth...
		let responseData: any;
		// tslint:disable-next-line:no-any
		let returnData: any[] = [];
		const items = this.getInputData();
		const resource  = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const credentials = await this.getCredentials('koboToolboxApi') as IDataObject;


		const baseOptions = {
			headers: {
				'Accept': 'application/json',
				'Authorization': `Token ${credentials.token}`,
			},
		};

		for (let i = 0; i < items.length; i++) {
			// tslint:disable-next-line:variable-name - to stay consistent with the Kobo API doc conventions
			const asset_uid = this.getNodeParameter('asset_uid', i) as string;

			if (resource === 'submission') {
				// *********************************************************************
				//                             Submissions
				// *********************************************************************

				if (operation === 'query') {
					// ----------------------------------
					//          Submissions: query
					// ----------------------------------

					const limit = this.getNodeParameter('limit', i) as number;
					const start = this.getNodeParameter('start', i) as number;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					// console.dir(additionalFields);

					const options: IHttpRequestOptions = {
						url: `${credentials.URL}/api/v2/assets/${asset_uid}/data`,
						qs: {
							start,
							limit,
							...(additionalFields.query   && {query:  additionalFields.query}),
							...(additionalFields.sort    && {sort:   additionalFields.sort}),
							...(additionalFields.fields  && {fields: JSON.stringify(additionalFields.fields.toString().split(',').map(s => s.trim()))}),
						},
						...baseOptions,
					};
					// console.dir(options);

					responseData = await this.helpers.httpRequest(options);
				}

				if (operation === 'get') {
					// ----------------------------------
					//          Submissions: get
					// ----------------------------------
					const id = this.getNodeParameter('id', i) as string;

					const options: IHttpRequestOptions = {
						url: `${credentials.URL}/api/v2/assets/${asset_uid}/data/${id}`,
						...baseOptions,
					};

					responseData = await this.helpers.httpRequest(options);
				}

				if (operation === 'delete') {
					// ----------------------------------
					//          Submissions: delete
					// ----------------------------------
					const id = this.getNodeParameter('id', i) as string;

					const options: IHttpRequestOptions = {
						method: 'DELETE',
						url: `${credentials.URL}/api/v2/assets/${asset_uid}/data/${id}`,
						...baseOptions,
					};

					responseData = await this.helpers.httpRequest(options);
				}
			}

			if (resource === 'form') {
				// *********************************************************************
				//                             Form
				// *********************************************************************

				if (operation === 'get') {
					// ----------------------------------
					//          Form: get
					// ----------------------------------
					const options: IHttpRequestOptions = {
						url: `${credentials.URL}/api/v2/assets/${asset_uid}`,
						...baseOptions,
					};

					responseData = await this.helpers.httpRequest(options);
				}
			}

			if (resource === 'hook') {
				// *********************************************************************
				//                             Hook
				// *********************************************************************

				if (operation === 'list') {
					// ----------------------------------
					//          Hook: list
					// ----------------------------------
					const options: IHttpRequestOptions = {
						url: `${credentials.URL}/api/v2/assets/${asset_uid}/hooks`,
						...baseOptions,
					};

					responseData = await this.helpers.httpRequest(options);
				}

				if (operation === 'get') {
					// ----------------------------------
					//          Hook: get
					// ----------------------------------
					const id = this.getNodeParameter('id', i) as string;
					const options: IHttpRequestOptions = {
						url: `${credentials.URL}/api/v2/assets/${asset_uid}/hooks/${id}`,
						...baseOptions,
					};

					responseData = await this.helpers.httpRequest(options);
				}

				if (operation === 'retry_all') {
					// ----------------------------------
					//          Hook: retry_all
					// ----------------------------------
					const id = this.getNodeParameter('id', i) as string;
					const options: IHttpRequestOptions = {
						method: 'PATCH',
						url: `${credentials.URL}/api/v2/assets/${asset_uid}/hooks/${id}/retry`,
						...baseOptions,
					};

					responseData = await this.helpers.httpRequest(options);
				}

				if (operation === 'logs') {
					// ----------------------------------
					//          Hook: logs
					// ----------------------------------
					const id = this.getNodeParameter('id', i) as string;
					const options: IHttpRequestOptions = {
						url: `${credentials.URL}/api/v2/assets/${asset_uid}/hooks/${id}/logs`,
						...baseOptions,
					};

					responseData = await this.helpers.httpRequest(options);
				}

				if (operation === 'retry_one') {
					// ----------------------------------
					//          Hook: retry_one
					// ----------------------------------
					const id = this.getNodeParameter('id', i) as string;
					// tslint:disable-next-line:variable-name - to stay consistent with the Kobo API doc conventions
					const log_id = this.getNodeParameter('log_id', i) as string;
					const options: IHttpRequestOptions = {
						url: `${credentials.URL}/api/v2/assets/${asset_uid}/hooks/${id}/logs/${log_id}/retry`,
						...baseOptions,
					};

					responseData = await this.helpers.httpRequest(options);
				}
			}

			if (responseData) {
				if(responseData.hasOwnProperty('count') && responseData.hasOwnProperty('results') && responseData.hasOwnProperty('next') && responseData.hasOwnProperty('previous')) {
					// It's a paginated list, append all results
					// TODO: return a pagination indicator??
					returnData = returnData.concat(responseData.results);
				}
				else {
					// It's a single response, return it
					returnData = returnData.concat([responseData]);
				}
			}
		}
		// Map data to n8n data
		return [this.helpers.returnJsonArray(returnData)];
	}
}
