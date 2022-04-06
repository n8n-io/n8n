import {
	BINARY_ENCODING,
	IExecuteFunctions,
	WAIT_TIME_UNLIMITED,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	NodeOperationError,
} from 'n8n-workflow';

import * as basicAuth from 'basic-auth';

import { Response } from 'express';

import * as fs from 'fs';

import * as formidable from 'formidable';

import * as isbot from 'isbot';

function authorizationError(resp: Response, realm: string, responseCode: number, message?: string) {
	if (message === undefined) {
		message = 'Authorization problem!';
		if (responseCode === 401) {
			message = 'Authorization is required!';
		} else if (responseCode === 403) {
			message = 'Authorization data is wrong!';
		}
	}

	resp.writeHead(responseCode, { 'WWW-Authenticate': `Basic realm="${realm}"` });
	resp.end(message);
	return {
		noWebhookResponse: true,
	};
}

export class Wait implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Wait',
		name: 'wait',
		icon: 'fa:pause-circle',
		group: ['organization'],
		version: 1,
		description: 'Wait before continue with execution',
		defaults: {
			name: 'Wait',
			color: '#804050',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'httpBasicAuth',
				required: true,
				displayOptions: {
					show: {
						incomingAuthentication: [
							'basicAuth',
						],
					},
				},
			},
			{
				name: 'httpHeaderAuth',
				required: true,
				displayOptions: {
					show: {
						incomingAuthentication: [
							'headerAuth',
						],
					},
				},
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: '={{$parameter["httpMethod"]}}',
				isFullPath: true,
				responseCode: '={{$parameter["responseCode"]}}',
				responseMode: '={{$parameter["responseMode"]}}',
				responseData: '={{$parameter["responseData"]}}',
				responseBinaryPropertyName: '={{$parameter["responseBinaryPropertyName"]}}',
				responseContentType: '={{$parameter["options"]["responseContentType"]}}',
				responsePropertyName: '={{$parameter["options"]["responsePropertyName"]}}',
				responseHeaders: '={{$parameter["options"]["responseHeaders"]}}',
				path: '={{$parameter["options"]["webhookSuffix"] || ""}}',
				restartWebhook: true,
			},
		],
		properties: [
			{
				displayName: 'Webhook authentication',
				name: 'incomingAuthentication',
				type: 'options',
				displayOptions: {
					show: {
						resume: [
							'webhook',
						],
					},
				},
				options: [
					{
						name: 'Basic Auth',
						value: 'basicAuth',
					},
					{
						name: 'Header Auth',
						value: 'headerAuth',
					},
					{
						name: 'None',
						value: 'none',
					},
				],
				default: 'none',
				description: 'If and how incoming resume-webhook-requests to $resumeWebhookUrl should be authenticated for additional security.',
			},
			{
				displayName: 'Resume',
				name: 'resume',
				type: 'options',
				options: [
					{
						name: 'After time interval',
						value: 'timeInterval',
						description: 'Waits for a certain amount of time',
					},
					{
						name: 'At specified time',
						value: 'specificTime',
						description: 'Waits until a specific date and time to continue',
					},
					{
						name: 'On webhook call',
						value: 'webhook',
						description: 'Waits for a webhook call before continuing',
					},
				],
				default: 'timeInterval',
				description: 'Determines the waiting mode to use before the workflow continues',
			},

			// ----------------------------------
			//         resume:specificTime
			// ----------------------------------
			{
				displayName: 'Date and Time',
				name: 'dateTime',
				type: 'dateTime',
				displayOptions: {
					show: {
						resume: [
							'specificTime',
						],
					},
				},
				default: '',
				description: 'The date and time to wait for before continuing',
			},

			// ----------------------------------
			//         resume:timeInterval
			// ----------------------------------
			{
				displayName: 'Wait Amount',
				name: 'amount',
				type: 'number',
				displayOptions: {
					show: {
						resume: [
							'timeInterval',
						],
					},
				},
				typeOptions: {
					minValue: 0,
					numberPrecision: 2,
				},
				default: 1,
				description: 'The time to wait',
			},
			{
				displayName: 'Wait Unit',
				name: 'unit',
				type: 'options',
				displayOptions: {
					show: {
						resume: [
							'timeInterval',
						],
					},
				},
				options: [
					{
						name: 'Seconds',
						value: 'seconds',
					},
					{
						name: 'Minutes',
						value: 'minutes',
					},
					{
						name: 'Hours',
						value: 'hours',
					},
					{
						name: 'Days',
						value: 'days',
					},
				],
				default: 'hours',
				description: 'The time unit of the Wait Amount value',
			},


			// ----------------------------------
			//         resume:webhook
			// ----------------------------------
			{
				displayName: 'The webhook URL will be generated at run time. It can be referenced with the <strong>$resumeWebhookUrl</strong> variable. Send it somewhere before getting to this node. <a href="https://docs.n8n.io/nodes/n8n-nodes-base.wait?utm_source=n8n_app&utm_medium=node_settings_modal-credential_link&utm_campaign=n8n-nodes-base.wait" target="_blank">More info</a>',
				name: 'webhookNotice',
				type: 'notice',
				displayOptions: {
					show: {
						resume: [
							'webhook',
						],
					},
				},
				default: '',
			},
			{
				displayName: 'HTTP Method',
				name: 'httpMethod',
				type: 'options',
				displayOptions: {
					show: {
						resume: [
							'webhook',
						],
					},
				},
				options: [
					{
						name: 'DELETE',
						value: 'DELETE',
					},
					{
						name: 'GET',
						value: 'GET',
					},
					{
						name: 'HEAD',
						value: 'HEAD',
					},
					{
						name: 'PATCH',
						value: 'PATCH',
					},
					{
						name: 'POST',
						value: 'POST',
					},
					{
						name: 'PUT',
						value: 'PUT',
					},
				],
				default: 'GET',
				description: 'The HTTP method of the Webhook call',
			},
			{
				displayName: 'Response Code',
				name: 'responseCode',
				type: 'number',
				displayOptions: {
					show: {
						resume: [
							'webhook',
						],
					},
				},
				typeOptions: {
					minValue: 100,
					maxValue: 599,
				},
				default: 200,
				description: 'The HTTP Response code to return',
			},
			{
				displayName: 'Respond',
				name: 'responseMode',
				type: 'options',
				displayOptions: {
					show: {
						resume: [
							'webhook',
						],
					},
				},
				options: [
					{
						name: 'Immediately',
						value: 'onReceived',
						description: 'As soon as this node executes',
					},
					{
						name: 'When last node finishes',
						value: 'lastNode',
						description: 'Returns data of the last-executed node',
					},
					{
						name: 'Using \'Respond to Webhook\' node',
						value: 'responseNode',
						description: 'Response defined in that node',
					},
				],
				default: 'onReceived',
				description: 'When and how to respond to the webhook',
			},
			{
				displayName: 'Response Data',
				name: 'responseData',
				type: 'options',
				displayOptions: {
					show: {
						resume: [
							'webhook',
						],
						responseMode: [
							'lastNode',
						],
					},
				},
				options: [
					{
						name: 'All Entries',
						value: 'allEntries',
						description: 'Returns all the entries of the last node. Always returns an array',
					},
					{
						name: 'First Entry JSON',
						value: 'firstEntryJson',
						description: 'Returns the JSON data of the first entry of the last node. Always returns a JSON object',
					},
					{
						name: 'First Entry Binary',
						value: 'firstEntryBinary',
						description: 'Returns the binary data of the first entry of the last node. Always returns a binary file',
					},
				],
				default: 'firstEntryJson',
				description: 'What data should be returned. If it should return all the items as array or only the first item as object',
			},
			{
				displayName: 'Property Name',
				name: 'responseBinaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: {
					show: {
						resume: [
							'webhook',
						],
						responseData: [
							'firstEntryBinary',
						],
					},
				},
				description: 'Name of the binary property to return',
			},
			{
				displayName: 'Limit wait time',
				name: 'limitWaitTime',
				type: 'boolean',
				default: false,
				description: `If no webhook call is received, the workflow will automatically
							 resume execution after the specified limit type`,
				displayOptions: {
					show: {
						resume: [
							'webhook',
						],
					},
				},
			},
			{
				displayName: 'Limit type',
				name: 'limitType',
				type: 'options',
				default: 'afterTimeInterval',
				description: `Sets the condition for the execution to resume. Can be a specified date or after some time.`,
				displayOptions: {
					show: {
						limitWaitTime: [
							true,
						],
						resume: [
							'webhook',
						],
					},
				},
				options: [
					{
						name: 'After time interval',
						description: 'Waits for a certain amount of time',
						value: 'afterTimeInterval',
					},
					{
						name: 'At specified time',
						description: 'Waits until the set date and time to continue',
						value: 'atSpecifiedTime',
					},
				],
			},
			{
				displayName: 'Amount',
				name: 'resumeAmount',
				type: 'number',
				displayOptions: {
					show: {
						limitType: [
							'afterTimeInterval',
						],
						limitWaitTime: [
							true,
						],
						resume: [
							'webhook',
						],
					},
				},
				typeOptions: {
					minValue: 0,
					numberPrecision: 2,
				},
				default: 1,
				description: 'The time to wait',
			},
			{
				displayName: 'Unit',
				name: 'resumeUnit',
				type: 'options',
				displayOptions: {
					show: {
						limitType: [
							'afterTimeInterval',
						],
						limitWaitTime: [
							true,
						],
						resume: [
							'webhook',
						],
					},
				},
				options: [
					{
						name: 'Seconds',
						value: 'seconds',
					},
					{
						name: 'Minutes',
						value: 'minutes',
					},
					{
						name: 'Hours',
						value: 'hours',
					},
					{
						name: 'Days',
						value: 'days',
					},
				],
				default: 'hours',
				description: 'Unit of the interval value',
			},
			{
				displayName: 'Max Date and Time',
				name: 'maxDateAndTime',
				type: 'dateTime',
				displayOptions: {
					show: {
						limitType: [
							'atSpecifiedTime',
						],
						limitWaitTime: [
							true,
						],
						resume: [
							'webhook',
						],
					},
				},
				default: '',
				description: 'Continue execution after the specified date and time',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						resume: [
							'webhook',
						],
					},
				},
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Binary Data',
						name: 'binaryData',
						type: 'boolean',
						displayOptions: {
							show: {
								'/httpMethod': [
									'PATCH',
									'PUT',
									'POST',
								],
							},
						},
						default: false,
						description: 'Set to true if webhook will receive binary data',
					},
					{
						displayName: 'Binary Property',
						name: 'binaryPropertyName',
						type: 'string',
						default: 'data',
						required: true,
						displayOptions: {
							show: {
								binaryData: [
									true,
								],
							},
						},
						description: `Name of the binary property to which to write the data of
									the received file. If the data gets received via "Form-Data Multipart"
									it will be the prefix and a number starting with 0 will be attached to it.`,
					},
					{
						displayName: 'Ignore Bots',
						name: 'ignoreBots',
						type: 'boolean',
						default: false,
						description: 'Set to true to ignore requests from bots like link previewers and web crawlers',
					},
					{
						displayName: 'Response Data',
						name: 'responseData',
						type: 'string',
						displayOptions: {
							show: {
								'/responseMode': [
									'onReceived',
								],
							},
						},
						default: '',
						placeholder: 'success',
						description: 'Custom response data to send',
					},
					{
						displayName: 'Response Content-Type',
						name: 'responseContentType',
						type: 'string',
						displayOptions: {
							show: {
								'/responseData': [
									'firstEntryJson',
								],
								'/responseMode': [
									'lastNode',
								],
							},
						},
						default: '',
						placeholder: 'application/xml',
						description: 'Set a custom content-type to return if another one as the "application/json" should be returned',
					},
					{
						displayName: 'Response Headers',
						name: 'responseHeaders',
						placeholder: 'Add Response Header',
						description: 'Add headers to the webhook response',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'entries',
								displayName: 'Entries',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'Name of the header',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the header',
									},
								],
							},
						],
					},
					{
						displayName: 'Property Name',
						name: 'responsePropertyName',
						type: 'string',
						displayOptions: {
							show: {
								'/responseData': [
									'firstEntryJson',
								],
								'/responseMode': [
									'lastNode',
								],
							},
						},
						default: 'data',
						description: 'Name of the property to return the data of instead of the whole JSON',
					},
					{
						displayName: 'Webhook Suffix',
						name: 'webhookSuffix',
						type: 'string',
						default: '',
						placeholder: 'webhook',
						description: 'This suffix path will be appended to the restart URL. Helpful when using multiple wait nodes. Note: Does not support expressions.',
					},
					// {
					// 	displayName: 'Raw Body',
					// 	name: 'rawBody',
					// 	type: 'boolean',
					// 	displayOptions: {
					// 		hide: {
					// 			binaryData: [
					// 				true,
					// 			],
					// 		},
					// 	},
					// 	default: false,
					// 	description: 'Raw body (binary)',
					// },
				],
			},

		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		// INFO: Currently (20.06.2021) 100% identical with Webook-Node
		const incomingAuthentication = this.getNodeParameter('incomingAuthentication') as string;
		const options = this.getNodeParameter('options', {}) as IDataObject;
		const req = this.getRequestObject();
		const resp = this.getResponseObject();
		const headers = this.getHeaderData();
		const realm = 'Webhook';

		const ignoreBots = options.ignoreBots as boolean;
		if (ignoreBots && isbot((headers as IDataObject)['user-agent'] as string)) {
			return authorizationError(resp, realm, 403);
		}

		if (incomingAuthentication === 'basicAuth') {
			// Basic authorization is needed to call webhook
			const httpBasicAuth = await this.getCredentials('httpBasicAuth');

			if (httpBasicAuth === undefined || !httpBasicAuth.user || !httpBasicAuth.password) {
				// Data is not defined on node so can not authenticate
				return authorizationError(resp, realm, 500, 'No authentication data defined on node!');
			}

			const basicAuthData = basicAuth(req);

			if (basicAuthData === undefined) {
				// Authorization data is missing
				return authorizationError(resp, realm, 401);
			}

			if (basicAuthData.name !== httpBasicAuth!.user || basicAuthData.pass !== httpBasicAuth!.password) {
				// Provided authentication data is wrong
				return authorizationError(resp, realm, 403);
			}
		} else if (incomingAuthentication === 'headerAuth') {
			// Special header with value is needed to call webhook
			const httpHeaderAuth = await this.getCredentials('httpHeaderAuth');

			if (httpHeaderAuth === undefined || !httpHeaderAuth.name || !httpHeaderAuth.value) {
				// Data is not defined on node so can not authenticate
				return authorizationError(resp, realm, 500, 'No authentication data defined on node!');
			}
			const headerName = (httpHeaderAuth.name as string).toLowerCase();
			const headerValue = (httpHeaderAuth.value as string);

			if (!headers.hasOwnProperty(headerName) || (headers as IDataObject)[headerName] !== headerValue) {
				// Provided authentication data is wrong
				return authorizationError(resp, realm, 403);
			}
		}

		// @ts-ignore
		const mimeType = headers['content-type'] || 'application/json';
		if (mimeType.includes('multipart/form-data')) {
			// @ts-ignore
			const form = new formidable.IncomingForm({ multiples: true });

			return new Promise((resolve, reject) => {

				form.parse(req, async (err, data, files) => {
					const returnItem: INodeExecutionData = {
						binary: {},
						json: {
							headers,
							params: this.getParamsData(),
							query: this.getQueryData(),
							body: data,
						},
					};

					let count = 0;
					for (const xfile of Object.keys(files)) {
						const processFiles: formidable.File[] = [];
						let multiFile = false;
						if (Array.isArray(files[xfile])) {
							processFiles.push(...files[xfile] as formidable.File[]);
							multiFile = true;
						} else {
							processFiles.push(files[xfile] as formidable.File);
						}

						let fileCount = 0;
						for (const file of processFiles) {
							let binaryPropertyName = xfile;
							if (binaryPropertyName.endsWith('[]')) {
								binaryPropertyName = binaryPropertyName.slice(0, -2);
							}
							if (multiFile === true) {
								binaryPropertyName += fileCount++;
							}
							if (options.binaryPropertyName) {
								binaryPropertyName = `${options.binaryPropertyName}${count}`;
							}

							const fileJson = file.toJSON() as unknown as IDataObject;
							const fileContent = await fs.promises.readFile(file.path);

							returnItem.binary![binaryPropertyName] = await this.helpers.prepareBinaryData(Buffer.from(fileContent), fileJson.name as string, fileJson.type as string);

							count += 1;
						}
					}
					resolve({
						workflowData: [
							[
								returnItem,
							],
						],
					});
				});

			});
		}

		if (options.binaryData === true) {
			return new Promise((resolve, reject) => {
				const binaryPropertyName = options.binaryPropertyName || 'data';
				const data: Buffer[] = [];

				req.on('data', (chunk) => {
					data.push(chunk);
				});

				req.on('end', async () => {
					const returnItem: INodeExecutionData = {
						binary: {},
						json: {
							headers,
							params: this.getParamsData(),
							query: this.getQueryData(),
							body: this.getBodyData(),
						},
					};

					returnItem.binary![binaryPropertyName as string] = await this.helpers.prepareBinaryData(Buffer.concat(data));

					return resolve({
						workflowData: [
							[
								returnItem,
							],
						],
					});
				});

				req.on('error', (error) => {
					throw new NodeOperationError(this.getNode(), error);
				});
			});
		}

		const response: INodeExecutionData = {
			json: {
				headers,
				params: this.getParamsData(),
				query: this.getQueryData(),
				body: this.getBodyData(),
			},
		};

		if (options.rawBody) {
			response.binary = {
				data: {
					// @ts-ignore
					data: req.rawBody.toString(BINARY_ENCODING),
					mimeType,
				},
			};
		}

		let webhookResponse: string | undefined;
		if (options.responseData) {
			webhookResponse = options.responseData as string;
		}

		return {
			webhookResponse,
			workflowData: [
				[
					response,
				],
			],
		};
	}


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resume = this.getNodeParameter('resume', 0) as string;

		if (resume === 'webhook') {
			let waitTill = new Date(WAIT_TIME_UNLIMITED);

			const limitWaitTime = this.getNodeParameter('limitWaitTime', 0);

			if (limitWaitTime === true) {
				const limitType = this.getNodeParameter('limitType', 0);
				if (limitType === 'afterTimeInterval') {
					let waitAmount = this.getNodeParameter('resumeAmount', 0) as number;
					const resumeUnit = this.getNodeParameter('resumeUnit', 0);
					if (resumeUnit === 'minutes') {
						waitAmount *= 60;
					}
					if (resumeUnit === 'hours') {
						waitAmount *= 60 * 60;
					}
					if (resumeUnit === 'days') {
						waitAmount *= 60 * 60 * 24;
					}

					waitAmount *= 1000;

					waitTill = new Date(new Date().getTime() + waitAmount);
				} else {
					waitTill = new Date(this.getNodeParameter('maxDateAndTime', 0) as string);
				}
			}

			await this.putExecutionToWait(waitTill);

			return [this.getInputData()];
		}

		let waitTill: Date;
		if (resume === 'timeInterval') {
			const unit = this.getNodeParameter('unit', 0) as string;

			let waitAmount = this.getNodeParameter('amount', 0) as number;
			if (unit === 'minutes') {
				waitAmount *= 60;
			}
			if (unit === 'hours') {
				waitAmount *= 60 * 60;
			}
			if (unit === 'days') {
				waitAmount *= 60 * 60 * 24;
			}

			waitAmount *= 1000;

			waitTill = new Date(new Date().getTime() + waitAmount);

		} else {
			// resume: dateTime
			const dateTime = this.getNodeParameter('dateTime', 0) as string;

			waitTill = new Date(dateTime);
		}

		const waitValue = Math.max(waitTill.getTime() - new Date().getTime(), 0);

		if (waitValue < 65000) {
			// If wait time is shorter than 65 seconds leave execution active because
			// we just check the database every 60 seconds.
			return new Promise((resolve, reject) => {
				setTimeout(() => {
					resolve([this.getInputData()]);
				}, waitValue);
			});
		}

		// If longer than 60 seconds put execution to wait
		await this.putExecutionToWait(waitTill);

		return [this.getInputData()];
	}
}
