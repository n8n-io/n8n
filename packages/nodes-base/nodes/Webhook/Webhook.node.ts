/* eslint-disable n8n-nodes-base/node-execute-block-wrong-error-thrown */
import type {
	IWebhookFunctions,
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeExecutionData,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { BINARY_ENCODING, Node, NodeOperationError } from 'n8n-workflow';

import fs from 'fs';
import stream from 'stream';
import { promisify } from 'util';
import basicAuth from 'basic-auth';
import formidable from 'formidable';
import isbot from 'isbot';
import { file as tmpFile } from 'tmp-promise';
import { WebhookAuthorizationError } from './error';

const pipeline = promisify(stream.pipeline);

export class Webhook extends Node {
	description: INodeTypeDescription = {
		displayName: 'Webhook',
		icon: 'file:webhook.svg',
		name: 'webhook',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when a webhook is called',
		eventTriggerDescription: 'Waiting for you to call the Test URL',
		activationMessage: 'You can now make calls to your production webhook URL.',
		defaults: {
			name: 'Webhook',
		},
		triggerPanel: {
			header: '',
			executionsHelp: {
				inactive:
					'Webhooks have two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the \'listen\' button, then make a request to the test URL. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. <a data-key="activate">Activate</a> the workflow, then make requests to the production URL. These executions will show up in the executions list, but not in the editor.',
				active:
					'Webhooks have two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the \'listen\' button, then make a request to the test URL. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. Since the workflow is activated, you can make requests to the production URL. These executions will show up in the <a data-key="executions">executions list</a>, but not in the editor.',
			},
			activationHint:
				'Once you’ve finished building your workflow, run it without having to click this button by using the production webhook URL.',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'httpBasicAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: ['basicAuth'],
					},
				},
			},
			{
				name: 'httpHeaderAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: ['headerAuth'],
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
				responseData:
					'={{$parameter["responseData"] || ($parameter.options.noResponseBody ? "noData" : undefined) }}',
				responseBinaryPropertyName: '={{$parameter["responseBinaryPropertyName"]}}',
				responseContentType: '={{$parameter["options"]["responseContentType"]}}',
				responsePropertyName: '={{$parameter["options"]["responsePropertyName"]}}',
				responseHeaders: '={{$parameter["options"]["responseHeaders"]}}',
				path: '={{$parameter["path"]}}',
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
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
				description: 'The way to authenticate',
			},
			{
				displayName: 'HTTP Method',
				name: 'httpMethod',
				type: 'options',
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
				description: 'The HTTP method to listen to',
			},
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '',
				placeholder: 'webhook',
				required: true,
				description: 'The path to listen to',
			},
			{
				displayName: 'Respond',
				name: 'responseMode',
				type: 'options',
				options: [
					{
						name: 'Immediately',
						value: 'onReceived',
						description: 'As soon as this node executes',
					},
					{
						name: 'When Last Node Finishes',
						value: 'lastNode',
						description: 'Returns data of the last-executed node',
					},
					{
						name: "Using 'Respond to Webhook' Node",
						value: 'responseNode',
						description: 'Response defined in that node',
					},
				],
				default: 'onReceived',
				description: 'When and how to respond to the webhook',
			},
			{
				displayName:
					'Insert a \'Respond to Webhook\' node to control when and how you respond. <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/" target="_blank">More details</a>',
				name: 'webhookNotice',
				type: 'notice',
				displayOptions: {
					show: {
						responseMode: ['responseNode'],
					},
				},
				default: '',
			},
			{
				displayName: 'Response Code',
				name: 'responseCode',
				type: 'number',
				displayOptions: {
					hide: {
						responseMode: ['responseNode'],
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
				displayName: 'Response Data',
				name: 'responseData',
				type: 'options',
				displayOptions: {
					show: {
						responseMode: ['lastNode'],
					},
				},
				options: [
					{
						name: 'All Entries',
						value: 'allEntries',
						description: 'Returns all the entries of the last node. Always returns an array.',
					},
					{
						name: 'First Entry JSON',
						value: 'firstEntryJson',
						description:
							'Returns the JSON data of the first entry of the last node. Always returns a JSON object.',
					},
					{
						name: 'First Entry Binary',
						value: 'firstEntryBinary',
						description:
							'Returns the binary data of the first entry of the last node. Always returns a binary file.',
					},
					{
						name: 'No Response Body',
						value: 'noData',
						description: 'Returns without a body',
					},
				],
				default: 'firstEntryJson',
				description:
					'What data should be returned. If it should return all items as an array or only the first item as object.',
			},
			{
				displayName: 'Property Name',
				name: 'responseBinaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: {
					show: {
						responseData: ['firstEntryBinary'],
					},
				},
				description: 'Name of the binary property to return',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Binary Data',
						name: 'binaryData',
						type: 'boolean',
						displayOptions: {
							show: {
								'/httpMethod': ['PATCH', 'PUT', 'POST'],
							},
						},
						default: false,
						description: 'Whether the webhook will receive binary data',
					},
					{
						displayName: 'Binary Property',
						name: 'binaryPropertyName',
						type: 'string',
						default: 'data',
						required: true,
						displayOptions: {
							show: {
								binaryData: [true],
							},
						},
						description:
							'Name of the binary property to write the data of the received file to. If the data gets received via "Form-Data Multipart" it will be the prefix and a number starting with 0 will be attached to it.',
					},
					{
						displayName: 'Ignore Bots',
						name: 'ignoreBots',
						type: 'boolean',
						default: false,
						description:
							'Whether to ignore requests from bots like link previewers and web crawlers',
					},
					{
						displayName: 'No Response Body',
						name: 'noResponseBody',
						type: 'boolean',
						default: false,
						description: 'Whether to send any body in the response',
						displayOptions: {
							hide: {
								rawBody: [true],
							},
							show: {
								'/responseMode': ['onReceived'],
							},
						},
					},
					{
						displayName: 'Raw Body',
						name: 'rawBody',
						type: 'boolean',
						displayOptions: {
							hide: {
								binaryData: [true],
								noResponseBody: [true],
							},
						},
						default: false,
						// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
						description: 'Raw body (binary)',
					},
					{
						displayName: 'Response Data',
						name: 'responseData',
						type: 'string',
						displayOptions: {
							show: {
								'/responseMode': ['onReceived'],
							},
							hide: {
								noResponseBody: [true],
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
								'/responseData': ['firstEntryJson'],
								'/responseMode': ['lastNode'],
							},
						},
						default: '',
						placeholder: 'application/xml',
						// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-json
						description:
							'Set a custom content-type to return if another one as the "application/json" should be returned',
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
								'/responseData': ['firstEntryJson'],
								'/responseMode': ['lastNode'],
							},
						},
						default: 'data',
						description: 'Name of the property to return the data of instead of the whole JSON',
					},
				],
			},
		],
	};

	async webhook(context: IWebhookFunctions): Promise<IWebhookResponseData> {
		const options = context.getNodeParameter('options', {}) as {
			binaryData: boolean;
			ignoreBots: boolean;
			rawBody: Buffer;
			responseData?: string;
		};
		const req = context.getRequestObject();
		const resp = context.getResponseObject();

		try {
			if (options.ignoreBots && isbot(req.headers['user-agent']))
				throw new WebhookAuthorizationError(403);
			await this.validateAuth(context);
		} catch (error) {
			if (error instanceof WebhookAuthorizationError) {
				resp.writeHead(error.responseCode, { 'WWW-Authenticate': 'Basic realm="Webhook"' });
				resp.end(error.message);
				return { noWebhookResponse: true };
			}
			throw error;
		}

		const mimeType = req.headers['content-type'] ?? 'application/json';
		if (mimeType.includes('multipart/form-data')) {
			return this.handleFormData(context);
		}

		if (options.binaryData) {
			return this.handleBinaryData(context);
		}

		const response: INodeExecutionData = {
			json: {
				headers: req.headers,
				params: req.params,
				query: req.query,
				body: req.body,
			},
			binary: options.rawBody
				? {
						data: {
							data: req.rawBody.toString(BINARY_ENCODING),
							mimeType,
						},
				  }
				: undefined,
		};

		return {
			webhookResponse: options.responseData,
			workflowData: [[response]],
		};
	}

	private async validateAuth(context: IWebhookFunctions) {
		const authentication = context.getNodeParameter('authentication') as string;
		if (authentication === 'none') return;

		const req = context.getRequestObject();
		const headers = context.getHeaderData();

		if (authentication === 'basicAuth') {
			// Basic authorization is needed to call webhook
			let expectedAuth: ICredentialDataDecryptedObject | undefined;
			try {
				expectedAuth = await context.getCredentials('httpBasicAuth');
			} catch {}

			if (expectedAuth === undefined || !expectedAuth.user || !expectedAuth.password) {
				// Data is not defined on node so can not authenticate
				throw new WebhookAuthorizationError(500, 'No authentication data defined on node!');
			}

			const providedAuth = basicAuth(req);
			// Authorization data is missing
			if (!providedAuth) throw new WebhookAuthorizationError(401);

			if (providedAuth.name !== expectedAuth.user || providedAuth.pass !== expectedAuth.password) {
				// Provided authentication data is wrong
				throw new WebhookAuthorizationError(403);
			}
		} else if (authentication === 'headerAuth') {
			// Special header with value is needed to call webhook
			let expectedAuth: ICredentialDataDecryptedObject | undefined;
			try {
				expectedAuth = await context.getCredentials('httpHeaderAuth');
			} catch {}

			if (expectedAuth === undefined || !expectedAuth.name || !expectedAuth.value) {
				// Data is not defined on node so can not authenticate
				throw new WebhookAuthorizationError(500, 'No authentication data defined on node!');
			}
			const headerName = (expectedAuth.name as string).toLowerCase();
			const expectedValue = expectedAuth.value as string;

			if (
				!headers.hasOwnProperty(headerName) ||
				(headers as IDataObject)[headerName] !== expectedValue
			) {
				// Provided authentication data is wrong
				throw new WebhookAuthorizationError(403);
			}
		}
	}

	private async handleFormData(context: IWebhookFunctions) {
		const req = context.getRequestObject();
		const options = context.getNodeParameter('options', {}) as IDataObject;

		const form = new formidable.IncomingForm({ multiples: true });

		return new Promise<IWebhookResponseData>((resolve, _reject) => {
			form.parse(req, async (err, data, files) => {
				const returnItem: INodeExecutionData = {
					binary: {},
					json: {
						headers: req.headers,
						params: req.params,
						query: req.query,
						body: data,
					},
				};

				let count = 0;
				for (const xfile of Object.keys(files)) {
					const processFiles: formidable.File[] = [];
					let multiFile = false;
					if (Array.isArray(files[xfile])) {
						processFiles.push(...(files[xfile] as formidable.File[]));
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
						if (multiFile) {
							binaryPropertyName += fileCount++;
						}
						if (options.binaryPropertyName) {
							binaryPropertyName = `${options.binaryPropertyName}${count}`;
						}

						const fileJson = file.toJSON();
						returnItem.binary![binaryPropertyName] = await context.nodeHelpers.copyBinaryFile(
							file.path,
							fileJson.name || fileJson.filename,
							fileJson.type as string,
						);

						count += 1;
					}
				}
				resolve({ workflowData: [[returnItem]] });
			});
		});
	}

	private async handleBinaryData(context: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = context.getRequestObject();
		const options = context.getNodeParameter('options', {}) as IDataObject;

		const binaryFile = await tmpFile({ prefix: 'n8n-webhook-' });

		try {
			await pipeline(req, fs.createWriteStream(binaryFile.path));

			const returnItem: INodeExecutionData = {
				binary: {},
				json: {
					headers: req.headers,
					params: req.params,
					query: req.query,
					body: req.body,
				},
			};

			const binaryPropertyName = (options.binaryPropertyName || 'data') as string;
			returnItem.binary![binaryPropertyName] = await context.nodeHelpers.copyBinaryFile(
				binaryFile.path,
				req.headers['content-type'] ?? 'application/octet-stream',
			);

			return { workflowData: [[returnItem]] };
		} catch (error) {
			throw new NodeOperationError(context.getNode(), error as Error);
		} finally {
			await binaryFile.cleanup();
		}
	}
}
