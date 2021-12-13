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
	LoggerProxy as Logger,
	NodeCredentialTestResult,
} from 'n8n-workflow';

import {
	formatSubmission,
	koboToolboxApiRequest,
	parseStringList,
} from './GenericFunctions';

import {
	attachmentOptions,
	formattingOptions,
	generalOptions,
	hookOptions,
	operations,
	queryOptions,
	submissionOptions,
} from './descriptions';

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
						name: 'Attachment',
						value: 'attachment',
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
			...operations,
			...generalOptions,
			...submissionOptions,
			...hookOptions,
			...queryOptions,
			...attachmentOptions,
			{
				...formattingOptions,
				displayOptions: {
					show: {
						resource: [
							'submission',
							'attachment',
						],
						operation: [
							'get',
							'query',
							'download',
						],
					},
				},
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
					Logger.debug('KoboToolboxTestCredentials', response);

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
		const binaryItems: INodeExecutionData[] = [];
		const items = this.getInputData();
		const resource  = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;


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
					const queryOptions = this.getNodeParameter('queryOptions', i) as IDataObject;
					const formatOptions = this.getNodeParameter('formatOptions', i) as IDataObject;

					({results: responseData} = await koboToolboxApiRequest.call(this, {
						url: `/api/v2/assets/${asset_uid}/data/`,
						qs: {
							start,
							limit,
							...(queryOptions.query   && {query:  queryOptions.query}),
							...(queryOptions.sort    && {sort:   queryOptions.sort}),
							...(queryOptions.fields  && {fields: JSON.stringify(parseStringList(queryOptions.fields as string))}),
						},
					}));

					if(formatOptions.reformat) {
						responseData = responseData.map((submission : IDataObject) => {
							return formatSubmission(submission, parseStringList(formatOptions.select_mask as string), parseStringList(formatOptions.number_mask as string));
						});
					}
				}

				if (operation === 'get') {
					// ----------------------------------
					//          Submissions: get
					// ----------------------------------
					const id = this.getNodeParameter('id', i) as string;
					const formatOptions = this.getNodeParameter('formatOptions', i) as IDataObject;

					responseData = [await koboToolboxApiRequest.call(this, {
						url: `/api/v2/assets/${asset_uid}/data/${id}`,
					})];

					if(formatOptions.reformat) {
						responseData = responseData.map((submission : IDataObject) => {
							return formatSubmission(submission, parseStringList(formatOptions.select_mask as string), parseStringList(formatOptions.number_mask as string));
						});
					}
				}

				if (operation === 'delete') {
					// ----------------------------------
					//          Submissions: delete
					// ----------------------------------
					const id = this.getNodeParameter('id', i) as string;

					responseData = [await koboToolboxApiRequest.call(this, {
						method: 'DELETE',
						url: `/api/v2/assets/${asset_uid}/data/${id}`,
					})];
				}

				if (operation === 'get_validation') {
					// ----------------------------------
					//          Submissions: get_validation
					// ----------------------------------
					const id = this.getNodeParameter('id', i) as string;

					responseData = [await koboToolboxApiRequest.call(this, {
						url: `/api/v2/assets/${asset_uid}/data/${id}/validation_status/`,
					})];
				}

				if (operation === 'set_validation') {
					// ----------------------------------
					//          Submissions: set_validation
					// ----------------------------------
					const id = this.getNodeParameter('id', i) as string;
					const status = this.getNodeParameter('validationStatus', i) as string;

					responseData = [await koboToolboxApiRequest.call(this, {
						method: 'PATCH',
						url: `/api/v2/assets/${asset_uid}/data/${id}/validation_status/`,
						body: {
							"validation_status.uid": status,
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
					responseData = [await koboToolboxApiRequest.call(this, {
						url: `/api/v2/assets/${asset_uid}`,
					})];
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
					({results: responseData} = await koboToolboxApiRequest.call(this, {
						url: `/api/v2/assets/${asset_uid}/hooks/`,
					}));
				}

				if (operation === 'get') {
					// ----------------------------------
					//          Hook: get
					// ----------------------------------
					const id = this.getNodeParameter('id', i) as string;
					responseData = [await koboToolboxApiRequest.call(this, {
						url: `/api/v2/assets/${asset_uid}/hooks/${id}`,
					})];
				}

				if (operation === 'retry_all') {
					// ----------------------------------
					//          Hook: retry_all
					// ----------------------------------
					const id = this.getNodeParameter('id', i) as string;
					responseData = [await koboToolboxApiRequest.call(this, {
						method: 'PATCH',
						url: `/api/v2/assets/${asset_uid}/hooks/${id}/retry/`,
					})];
				}

				if (operation === 'logs') {
					// ----------------------------------
					//          Hook: logs
					// ----------------------------------
					const id = this.getNodeParameter('id', i) as string;
					({results: responseData} = await koboToolboxApiRequest.call(this, {
						url: `/api/v2/assets/${asset_uid}/hooks/${id}/logs/`,
					}));
				}

				if (operation === 'retry_one') {
					// ----------------------------------
					//          Hook: retry_one
					// ----------------------------------
					const id = this.getNodeParameter('id', i) as string;
					// tslint:disable-next-line:variable-name - to stay consistent with the Kobo API doc conventions
					const log_id = this.getNodeParameter('log_id', i) as string;

					responseData = [await koboToolboxApiRequest.call(this, {
						url: `/api/v2/assets/${asset_uid}/hooks/${id}/logs/${log_id}/retry/`,
					})];
				}
			}

			if (resource === 'attachment') {
				// *********************************************************************
				//                             Attachment
				// *********************************************************************

				if (operation === 'download') {
					// ----------------------------------
					//          Attachment: download
					// ----------------------------------

					// Download submission details
					const id = this.getNodeParameter('id', i) as string;
					const attachmentOptions = this.getNodeParameter('attachmentOptions', i) as IDataObject;
					const formatOptions = this.getNodeParameter('formatOptions', i) as IDataObject;
					let submission = await koboToolboxApiRequest.call(this, {
						url: `/api/v2/assets/${asset_uid}/data/${id}`,
					});
					if(formatOptions.reformat) {
						submission = formatSubmission(submission, parseStringList(formatOptions.select_mask as string), parseStringList(formatOptions.number_mask as string));
					}

					// Initialize return object with the original submission JSON content
					const newItem: INodeExecutionData = {
						json: {
							...submission,
						},
						binary: {},
					};

					// Look for attachment links - there can be more than one
					const attachmentList = submission['_attachments'] || submission['attachments'];
					if(attachmentList && attachmentList.length) {

						for (const attachment of attachmentList) {
							// look for the question name linked to this attachment
							const filename = attachment.filename;
							let relatedQuestion = '';
							Logger.debug(`Found attachment ${filename}`);
							Object.keys(submission).forEach(question => {
								if(filename.endsWith('/' + submission[question])) {
									relatedQuestion = question;
									Logger.debug(`Found attachment for form question: ${relatedQuestion}`);
								}
							});

							// Download attachment
							const binaryData = await koboToolboxApiRequest.call(this, {
								url: attachment[attachmentOptions.version as string] || attachment.download_url,
								encoding: 'arraybuffer',
							});
							Logger.debug(`Downloaded attachment ${filename}`);
							const binaryName = attachmentOptions.filename === 'filename' ? filename : relatedQuestion;
							newItem.binary![binaryName] = await this.helpers.prepareBinaryData(Buffer.from(binaryData));
						}
					}

					// Add item to final output - even if there's no attachment retrieved
					binaryItems.push(newItem);
				}
			}

			returnData = returnData.concat(responseData);
		}

		// Map data to n8n data
		return binaryItems.length
			? [binaryItems]
			: [this.helpers.returnJsonArray(returnData)];
	}
}
