import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	// LoggerProxy as Logger,
	NodeCredentialTestResult,
} from 'n8n-workflow';

import {
	downloadAttachments,
	formatSubmission,
	koBoToolboxApiRequest,
	loadHooks,
	loadSurveys,
	parseStringList,
} from './GenericFunctions';

import {
	formQueryOptions,
	generalOptions,
	hookOptions,
	operations,
	options,
	submissionOptions,
	submissionQueryOptions,
} from './descriptions';

export class KoBoToolbox implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'KoBoToolbox',
		name: 'koBoToolbox',
		icon: 'file:koBoToolbox.svg',
		group: ['transform'],
		version: 1,
		description: 'Work with KoBoToolbox forms and submissions',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'KoBoToolbox',
			color: '#64C0FF',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'koBoToolboxApi',
				required: true,
				testedBy: 'koBoToolboxApiCredentialTest',
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
						name: 'Hook',
						value: 'hook',
					},
					{
						name: 'Submission',
						value: 'submission',
					},
				],
				default: 'submission',
				required: true,
				description: 'Resource to consume',
			},
			...operations,
			...generalOptions,
			...submissionOptions,
			...formQueryOptions,
			...hookOptions,
			...submissionQueryOptions,
			{
				...options,
				displayOptions: {
					show: {
						resource: [
							'submission',
						],
						operation: [
							'get',
							'query',
						],
					},
				},
			},
		],
	};

	methods = {
		credentialTest: {
			async koBoToolboxApiCredentialTest(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<NodeCredentialTestResult> {
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
					// Logger.debug('KoBoToolboxTestCredentials', response);

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

		loadOptions: {
			loadHooks,
			loadSurveys,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// tslint:disable-next-line:no-any - it's the sad truth...
		let responseData: any;
		// tslint:disable-next-line:no-any
		let returnData: any[] = [];
		const binaryItems: INodeExecutionData[] = [];
		const items = this.getInputData();
		const resource  = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;


		for (let i = 0; i < items.length; i++) {
			// tslint:disable-next-line:variable-name - to stay consistent with the Kobo API doc conventions
			if (resource === 'submission') {
				// *********************************************************************
				//                             Submissions
				// *********************************************************************
				const assetUid = this.getNodeParameter('assetUid', i) as string;

				if (operation === 'query') {
					// ----------------------------------
					//          Submissions: query
					// ----------------------------------

					const submissionQueryOptions = this.getNodeParameter('submissionQueryOptions', i) as IDataObject;
					const formatOptions = this.getNodeParameter('formatOptions', i) as IDataObject;

					responseData = await koBoToolboxApiRequest.call(this, {
						url: `/api/v2/assets/${assetUid}/data/`,
						qs: {
							start: this.getNodeParameter('start', i, 0) as number,
							limit: this.getNodeParameter('limit', i, 1000) as number,
							...(submissionQueryOptions.query   && {query:  submissionQueryOptions.query}),
							...(submissionQueryOptions.sort    && {sort:   submissionQueryOptions.sort}),
							...(submissionQueryOptions.fields  && {fields: JSON.stringify(parseStringList(submissionQueryOptions.fields as string))}),
						},
						scroll: this.getNodeParameter('scroll', i) as boolean,
					});

					if(formatOptions.reformat) {
						responseData = responseData.map((submission : IDataObject) => {
							return formatSubmission(submission, parseStringList(formatOptions.selectMask as string), parseStringList(formatOptions.numberMask as string));
						});
					}

					if(formatOptions.download) {
						// Download related attachments
						for(const submission of responseData) {
							binaryItems.push(await downloadAttachments.call(this, submission, formatOptions));
						}
					}
				}

				if (operation === 'get') {
					// ----------------------------------
					//          Submissions: get
					// ----------------------------------
					const id = this.getNodeParameter('id', i) as string;
					const formatOptions = this.getNodeParameter('formatOptions', i) as IDataObject;

					responseData = [await koBoToolboxApiRequest.call(this, {
						url: `/api/v2/assets/${assetUid}/data/${id}`,
					})];

					if(formatOptions.reformat) {
						responseData = responseData.map((submission : IDataObject) => {
							return formatSubmission(submission, parseStringList(formatOptions.selectMask as string), parseStringList(formatOptions.numberMask as string));
						});
					}

					if(formatOptions.download) {
						// Download related attachments
						for(const submission of responseData) {
							binaryItems.push(await downloadAttachments.call(this, submission, formatOptions));
						}
					}
				}

				if (operation === 'delete') {
					// ----------------------------------
					//          Submissions: delete
					// ----------------------------------
					const id = this.getNodeParameter('id', i) as string;

					await koBoToolboxApiRequest.call(this, {
						method: 'DELETE',
						url: `/api/v2/assets/${assetUid}/data/${id}`,
					});

					responseData = [{
						success: true,
					}];
				}

				if (operation === 'getValidation') {
					// ----------------------------------
					//          Submissions: getValidation
					// ----------------------------------
					const id = this.getNodeParameter('id', i) as string;

					responseData = [await koBoToolboxApiRequest.call(this, {
						url: `/api/v2/assets/${assetUid}/data/${id}/validation_status/`,
					})];
				}

				if (operation === 'setValidation') {
					// ----------------------------------
					//          Submissions: setValidation
					// ----------------------------------
					const id = this.getNodeParameter('id', i) as string;
					const status = this.getNodeParameter('validationStatus', i) as string;

					responseData = [await koBoToolboxApiRequest.call(this, {
						method: 'PATCH',
						url: `/api/v2/assets/${assetUid}/data/${id}/validation_status/`,
						body: {
							'validation_status.uid': status,
						},
					})];
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
					const assetUid = this.getNodeParameter('assetUid', i) as string;
					responseData = [await koBoToolboxApiRequest.call(this, {
						url: `/api/v2/assets/${assetUid}`,
					})];
				}

				if (operation === 'getAll') {
					// ----------------------------------
					//          Form: getAll
					// ----------------------------------
					const formQueryOptions  = this.getNodeParameter('formQueryOptions', i)  as IDataObject;
					const formFilterOptions = this.getNodeParameter('formFilterOptions', i) as IDataObject;

					responseData = await koBoToolboxApiRequest.call(this, {
						url: '/api/v2/assets/',
						qs: {
							start: this.getNodeParameter('start', i, 0) as number,
							limit: this.getNodeParameter('limit', i, 1000) as number,
							...(formFilterOptions.filter    && {q:     formFilterOptions.filter}),
							...(formQueryOptions.ordering  && {ordering: (formQueryOptions.descending ? '-' : '') + formQueryOptions.ordering}),
						},
						scroll: this.getNodeParameter('scroll', i) as boolean,
					});
				}
			}

			if (resource === 'hook') {
				const assetUid = this.getNodeParameter('assetUid', i) as string;
				// *********************************************************************
				//                             Hook
				// *********************************************************************

				if (operation === 'getAll') {
					// ----------------------------------
					//          Hook: getAll
					// ----------------------------------
					responseData = await koBoToolboxApiRequest.call(this, {
						url: `/api/v2/assets/${assetUid}/hooks/`,
						qs: {
							start: this.getNodeParameter('start', i, 0) as number,
							limit: this.getNodeParameter('limit', i, 1000) as number,
						},
						scroll: this.getNodeParameter('scroll', i) as boolean,
					});
				}

				if (operation === 'get') {
					// ----------------------------------
					//          Hook: get
					// ----------------------------------
					const id = this.getNodeParameter('id', i) as string;
					responseData = [await koBoToolboxApiRequest.call(this, {
						url: `/api/v2/assets/${assetUid}/hooks/${id}`,
					})];
				}

				if (operation === 'retryAll') {
					// ----------------------------------
					//          Hook: retryAll
					// ----------------------------------
					const id = this.getNodeParameter('id', i) as string;
					responseData = [await koBoToolboxApiRequest.call(this, {
						method: 'PATCH',
						url: `/api/v2/assets/${assetUid}/hooks/${id}/retry/`,
					})];
				}

				if (operation === 'getLogs') {
					// ----------------------------------
					//          Hook: getLogs
					// ----------------------------------
					const id = this.getNodeParameter('id', i) as string;
					const status = this.getNodeParameter('status', i) as string;
					responseData = await koBoToolboxApiRequest.call(this, {
						url: `/api/v2/assets/${assetUid}/hooks/${id}/logs/`,
						qs: {
							start: this.getNodeParameter('start', i, 0) as number,
							limit: this.getNodeParameter('limit', i, 1000) as number,
							...(status !== '' && {status}),
						},
						scroll: this.getNodeParameter('scroll', i) as boolean,
					});
				}

				if (operation === 'retryOne') {
					// ----------------------------------
					//          Hook: retryOne
					// ----------------------------------
					const id = this.getNodeParameter('id', i) as string;
					// tslint:disable-next-line:variable-name - to stay consistent with the Kobo API doc conventions
					const logId = this.getNodeParameter('logId', i) as string;

					responseData = [await koBoToolboxApiRequest.call(this, {
						url: `/api/v2/assets/${assetUid}/hooks/${id}/logs/${logId}/retry/`,
					})];
				}
			}

			returnData = returnData.concat(responseData);
		}

		// Map data to n8n data
		return binaryItems.length > 0
			? [binaryItems]
			: [this.helpers.returnJsonArray(returnData)];
	}
}
