import { IExecuteFunctions } from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';

import {
	downloadAttachments,
	formatSubmission,
	koBoToolboxApiRequest,
	loadForms,
	parseStringList,
} from './GenericFunctions';

import { formFields, formOperations } from './FormDescription';

import { submissionFields, submissionOperations } from './SubmissionDescription';

import { hookFields, hookOperations } from './HookDescription';

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
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'koBoToolboxApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
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
			},
			...formOperations,
			...formFields,
			...hookOperations,
			...hookFields,
			...submissionOperations,
			...submissionFields,
		],
	};

	methods = {
		loadOptions: {
			loadForms,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// tslint:disable-next-line:no-any
		let responseData: any;
		// tslint:disable-next-line:no-any
		let returnData: any[] = [];
		const binaryItems: INodeExecutionData[] = [];
		const items = this.getInputData();
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			if (resource === 'form') {
				// *********************************************************************
				//                             Form
				// *********************************************************************

				if (operation === 'get') {
					// ----------------------------------
					//          Form: get
					// ----------------------------------
					const formId = this.getNodeParameter('formId', i) as string;
					responseData = [
						await koBoToolboxApiRequest.call(this, {
							url: `/api/v2/assets/${formId}`,
						}),
					];
				}

				if (operation === 'getAll') {
					// ----------------------------------
					//          Form: getAll
					// ----------------------------------
					const formQueryOptions = this.getNodeParameter('options', i) as {
						sort: {
							value: {
								descending: boolean;
								ordering: string;
							};
						};
					};
					const formFilterOptions = this.getNodeParameter('filters', i) as IDataObject;

					responseData = await koBoToolboxApiRequest.call(this, {
						url: '/api/v2/assets/',
						qs: {
							limit: this.getNodeParameter('limit', i, 1000) as number,
							...(formFilterOptions.filter && { q: formFilterOptions.filter }),
							...(formQueryOptions?.sort?.value?.ordering && {
								ordering:
									(formQueryOptions?.sort?.value?.descending ? '-' : '') +
									formQueryOptions?.sort?.value?.ordering,
							}),
						},
						scroll: this.getNodeParameter('returnAll', i) as boolean,
					});
				}
			}
			if (resource === 'submission') {
				// *********************************************************************
				//                             Submissions
				// *********************************************************************
				const formId = this.getNodeParameter('formId', i) as string;

				if (operation === 'getAll') {
					// ----------------------------------
					//          Submissions: getAll
					// ----------------------------------

					const submissionQueryOptions = this.getNodeParameter('options', i) as IDataObject;
					const filterJson = this.getNodeParameter('filterJson', i, null) as string;

					responseData = await koBoToolboxApiRequest.call(this, {
						url: `/api/v2/assets/${formId}/data/`,
						qs: {
							limit: this.getNodeParameter('limit', i, 1000) as number,
							...(filterJson && { query: filterJson }),
							...(submissionQueryOptions.sort && { sort: submissionQueryOptions.sort }),
							...(submissionQueryOptions.fields && {
								fields: JSON.stringify(parseStringList(submissionQueryOptions.fields as string)),
							}),
						},
						scroll: this.getNodeParameter('returnAll', i) as boolean,
					});

					if (submissionQueryOptions.reformat) {
						responseData = responseData.map((submission: IDataObject) => {
							return formatSubmission(
								submission,
								parseStringList(submissionQueryOptions.selectMask as string),
								parseStringList(submissionQueryOptions.numberMask as string),
							);
						});
					}

					if (submissionQueryOptions.download) {
						// Download related attachments
						for (const submission of responseData) {
							binaryItems.push(
								await downloadAttachments.call(this, submission, submissionQueryOptions),
							);
						}
					}
				}

				if (operation === 'get') {
					// ----------------------------------
					//          Submissions: get
					// ----------------------------------
					const submissionId = this.getNodeParameter('submissionId', i) as string;
					const options = this.getNodeParameter('options', i) as IDataObject;

					responseData = [
						await koBoToolboxApiRequest.call(this, {
							url: `/api/v2/assets/${formId}/data/${submissionId}`,
							qs: {
								...(options.fields && {
									fields: JSON.stringify(parseStringList(options.fields as string)),
								}),
							},
						}),
					];

					if (options.reformat) {
						responseData = responseData.map((submission: IDataObject) => {
							return formatSubmission(
								submission,
								parseStringList(options.selectMask as string),
								parseStringList(options.numberMask as string),
							);
						});
					}

					if (options.download) {
						// Download related attachments
						for (const submission of responseData) {
							binaryItems.push(await downloadAttachments.call(this, submission, options));
						}
					}
				}

				if (operation === 'delete') {
					// ----------------------------------
					//          Submissions: delete
					// ----------------------------------
					const id = this.getNodeParameter('submissionId', i) as string;

					await koBoToolboxApiRequest.call(this, {
						method: 'DELETE',
						url: `/api/v2/assets/${formId}/data/${id}`,
					});

					responseData = [
						{
							success: true,
						},
					];
				}

				if (operation === 'getValidation') {
					// ----------------------------------
					//          Submissions: getValidation
					// ----------------------------------
					const submissionId = this.getNodeParameter('submissionId', i) as string;

					responseData = [
						await koBoToolboxApiRequest.call(this, {
							url: `/api/v2/assets/${formId}/data/${submissionId}/validation_status/`,
						}),
					];
				}

				if (operation === 'setValidation') {
					// ----------------------------------
					//          Submissions: setValidation
					// ----------------------------------
					const submissionId = this.getNodeParameter('submissionId', i) as string;
					const status = this.getNodeParameter('validationStatus', i) as string;

					responseData = [
						await koBoToolboxApiRequest.call(this, {
							method: 'PATCH',
							url: `/api/v2/assets/${formId}/data/${submissionId}/validation_status/`,
							body: {
								'validation_status.uid': status,
							},
						}),
					];
				}
			}

			if (resource === 'hook') {
				const formId = this.getNodeParameter('formId', i) as string;
				// *********************************************************************
				//                             Hook
				// *********************************************************************

				if (operation === 'getAll') {
					// ----------------------------------
					//          Hook: getAll
					// ----------------------------------
					responseData = await koBoToolboxApiRequest.call(this, {
						url: `/api/v2/assets/${formId}/hooks/`,
						qs: {
							limit: this.getNodeParameter('limit', i, 1000) as number,
						},
						scroll: this.getNodeParameter('returnAll', i) as boolean,
					});
				}

				if (operation === 'get') {
					// ----------------------------------
					//          Hook: get
					// ----------------------------------
					const hookId = this.getNodeParameter('hookId', i) as string;
					responseData = [
						await koBoToolboxApiRequest.call(this, {
							url: `/api/v2/assets/${formId}/hooks/${hookId}`,
						}),
					];
				}

				if (operation === 'retryAll') {
					// ----------------------------------
					//          Hook: retryAll
					// ----------------------------------
					const hookId = this.getNodeParameter('hookId', i) as string;
					responseData = [
						await koBoToolboxApiRequest.call(this, {
							method: 'PATCH',
							url: `/api/v2/assets/${formId}/hooks/${hookId}/retry/`,
						}),
					];
				}

				if (operation === 'getLogs') {
					// ----------------------------------
					//          Hook: getLogs
					// ----------------------------------
					const hookId = this.getNodeParameter('hookId', i) as string;
					const startDate = this.getNodeParameter('startDate', i, null);
					const endDate = this.getNodeParameter('endDate', i, null);
					const status = this.getNodeParameter('status', i, null);

					responseData = await koBoToolboxApiRequest.call(this, {
						url: `/api/v2/assets/${formId}/hooks/${hookId}/logs/`,
						qs: {
							...(startDate && { start: startDate }),
							...(endDate && { end: endDate }),
							...(status && { status }),
						},
					});
				}

				if (operation === 'retryOne') {
					// ----------------------------------
					//          Hook: retryOne
					// ----------------------------------
					const hookId = this.getNodeParameter('hookId', i) as string;
					const logId = this.getNodeParameter('logId', i) as string;

					responseData = [
						await koBoToolboxApiRequest.call(this, {
							method: 'PATCH',
							url: `/api/v2/assets/${formId}/hooks/${hookId}/logs/${logId}/retry/`,
						}),
					];
				}
			}

			returnData = returnData.concat(responseData);
		}

		// Map data to n8n data
		return binaryItems.length > 0 ? [binaryItems] : [this.helpers.returnJsonArray(returnData)];
	}
}
