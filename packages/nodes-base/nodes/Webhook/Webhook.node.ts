/* eslint-disable n8n-nodes-base/node-execute-block-wrong-error-thrown */
import { createWriteStream } from 'fs';
import { rm, stat } from 'fs/promises';
import isbot from 'isbot';
import type {
	IWebhookFunctions,
	IDataObject,
	INodeExecutionData,
	INodeTypeDescription,
	IWebhookResponseData,
	MultiPartFormData,
	INodeProperties,
} from 'n8n-workflow';
import { BINARY_ENCODING, NodeOperationError, Node } from 'n8n-workflow';
import { pipeline } from 'stream/promises';
import { file as tmpFile } from 'tmp-promise';
import { v4 as uuid } from 'uuid';

import {
	authenticationProperty,
	credentialsProperty,
	defaultWebhookDescription,
	httpMethodsProperty,
	optionsProperty,
	responseBinaryPropertyNameProperty,
	responseCodeOption,
	responseCodeProperty,
	responseDataProperty,
	responseModeProperty,
	responseModePropertyStreaming,
} from './description';
import { WebhookAuthorizationError } from './error';
import {
	checkResponseModeConfiguration,
	configuredOutputs,
	isIpWhitelisted,
	setupOutputConnection,
	validateWebhookAuthentication,
} from './utils';

export class Webhook extends Node {
	authPropertyName = 'authentication';

	description: INodeTypeDescription = {
		displayName: 'Webhook',
		icon: { light: 'file:webhook.svg', dark: 'file:webhook.dark.svg' },
		name: 'webhook',
		group: ['trigger'],
		version: [1, 1.1, 2, 2.1],
		defaultVersion: 2.1,
		description: 'Starts the workflow when a webhook is called',
		eventTriggerDescription: 'Waiting for you to call the Test URL',
		activationMessage: 'You can now make calls to your production webhook URL.',
		defaults: {
			name: 'Webhook',
		},
		supportsCORS: true,
		triggerPanel: {
			header: '',
			executionsHelp: {
				inactive:
					'Webhooks have two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the \'listen\' button, then make a request to the test URL. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. <a data-key="activate">Activate</a> the workflow, then make requests to the production URL. These executions will show up in the executions list, but not in the editor.',
				active:
					'Webhooks have two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the \'listen\' button, then make a request to the test URL. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. Since the workflow is activated, you can make requests to the production URL. These executions will show up in the <a data-key="executions">executions list</a>, but not in the editor.',
			},
			activationHint:
				"Once you've finished building your workflow, run it without having to click this button by using the production webhook URL.",
		},

		inputs: [],
		outputs: `={{(${configuredOutputs})($parameter)}}`,
		credentials: credentialsProperty(this.authPropertyName),
		webhooks: [defaultWebhookDescription],
		properties: [
			{
				displayName: 'Allow Multiple HTTP Methods',
				name: 'multipleMethods',
				type: 'boolean',
				default: false,
				isNodeSetting: true,
				description: 'Whether to allow the webhook to listen for multiple HTTP methods',
			},
			{
				...httpMethodsProperty,
				displayOptions: {
					show: {
						multipleMethods: [false],
					},
				},
			},
			{
				displayName: 'HTTP Methods',
				name: 'httpMethod',
				type: 'multiOptions',
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
				default: ['GET', 'POST'],
				description: 'The HTTP methods to listen to',
				displayOptions: {
					show: {
						multipleMethods: [true],
					},
				},
			},
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '',
				placeholder: 'webhook',
				description:
					"The path to listen to, dynamic values could be specified by using ':', e.g. 'your-path/:dynamic-value'. If dynamic values are set 'webhookId' would be prepended to path.",
			},
			authenticationProperty(this.authPropertyName),
			responseModeProperty,
			responseModePropertyStreaming,
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
				displayName:
					'Insert a node that supports streaming (e.g. \'AI Agent\') and enable streaming to stream directly to the response while the workflow is executed. <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/" target="_blank">More details</a>',
				name: 'webhookStreamingNotice',
				type: 'notice',
				displayOptions: {
					show: {
						responseMode: ['streaming'],
					},
				},
				default: '',
			},
			{
				...responseCodeProperty,
				displayOptions: {
					show: {
						'@version': [1, 1.1],
					},
					hide: {
						responseMode: ['responseNode'],
					},
				},
			},
			responseDataProperty,
			responseBinaryPropertyNameProperty,
			{
				displayName:
					'If you are sending back a response, add a "Content-Type" response header with the appropriate value to avoid unexpected behavior',
				name: 'contentTypeNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						responseMode: ['onReceived'],
					},
				},
			},

			{
				...optionsProperty,
				options: [...(optionsProperty.options as INodeProperties[]), responseCodeOption].sort(
					(a, b) => {
						const nameA = a.displayName.toUpperCase();
						const nameB = b.displayName.toUpperCase();
						if (nameA < nameB) return -1;
						if (nameA > nameB) return 1;
						return 0;
					},
				),
			},
		],
	};

	async webhook(context: IWebhookFunctions): Promise<IWebhookResponseData> {
		const { typeVersion: nodeVersion, type: nodeType } = context.getNode();
		const responseMode = context.getNodeParameter('responseMode', 'onReceived') as string;

		if (nodeVersion >= 2 && nodeType === 'n8n-nodes-base.webhook') {
			checkResponseModeConfiguration(context);
		}

		const options = context.getNodeParameter('options', {}) as {
			binaryData: boolean;
			ignoreBots: boolean;
			rawBody: boolean;
			responseData?: string;
			ipWhitelist?: string;
		};
		const req = context.getRequestObject();
		const resp = context.getResponseObject();
		const requestMethod = context.getRequestObject().method;

		if (!isIpWhitelisted(options.ipWhitelist, req.ips, req.ip)) {
			resp.writeHead(403);
			resp.end('IP is not whitelisted to access the webhook!');
			return { noWebhookResponse: true };
		}

		let validationData: IDataObject | undefined;
		try {
			if (options.ignoreBots && isbot(req.headers['user-agent']))
				throw new WebhookAuthorizationError(403);
			validationData = await this.validateAuth(context);
		} catch (error) {
			if (error instanceof WebhookAuthorizationError) {
				resp.writeHead(error.responseCode, { 'WWW-Authenticate': 'Basic realm="Webhook"' });
				resp.end(error.message);
				return { noWebhookResponse: true };
			}
			throw error;
		}

		const prepareOutput = setupOutputConnection(context, requestMethod, {
			jwtPayload: validationData,
		});

		if (options.binaryData) {
			return await this.handleBinaryData(context, prepareOutput);
		}

		if (req.contentType === 'multipart/form-data') {
			return await this.handleFormData(context, prepareOutput);
		}

		if (nodeVersion > 1 && !req.body && !options.rawBody) {
			try {
				return await this.handleBinaryData(context, prepareOutput);
			} catch (error) {}
		}

		if (options.rawBody && !req.rawBody) {
			await req.readRawBody();
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
							data: (req.rawBody ?? '').toString(BINARY_ENCODING),
							mimeType: req.contentType ?? 'application/json',
						},
					}
				: undefined,
		};

		if (responseMode === 'streaming') {
			const res = context.getResponseObject();

			// Set up streaming response headers
			res.writeHead(200, {
				'Content-Type': 'application/json; charset=utf-8',
				'Transfer-Encoding': 'chunked',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
			});

			// Flush headers immediately
			res.flushHeaders();

			return {
				noWebhookResponse: true,
				workflowData: prepareOutput(response),
			};
		}

		return {
			webhookResponse: options.responseData,
			workflowData: prepareOutput(response),
		};
	}

	private async validateAuth(context: IWebhookFunctions) {
		return await validateWebhookAuthentication(context, this.authPropertyName);
	}

	private async handleFormData(
		context: IWebhookFunctions,
		prepareOutput: (data: INodeExecutionData) => INodeExecutionData[][],
	) {
		const req = context.getRequestObject() as MultiPartFormData.Request;
		const options = context.getNodeParameter('options', {}) as IDataObject;
		const { data, files } = req.body;

		const returnItem: INodeExecutionData = {
			json: {
				headers: req.headers,
				params: req.params,
				query: req.query,
				body: data,
			},
		};

		if (files && Object.keys(files).length) {
			returnItem.binary = {};
		}

		let count = 0;

		for (const key of Object.keys(files)) {
			const processFiles: MultiPartFormData.File[] = [];
			let multiFile = false;
			if (Array.isArray(files[key])) {
				processFiles.push(...files[key]);
				multiFile = true;
			} else {
				processFiles.push(files[key]);
			}

			let fileCount = 0;
			for (const file of processFiles) {
				let binaryPropertyName = key;
				if (binaryPropertyName.endsWith('[]')) {
					binaryPropertyName = binaryPropertyName.slice(0, -2);
				}
				if (multiFile) {
					binaryPropertyName += fileCount++;
				}
				if (options.binaryPropertyName) {
					binaryPropertyName = `${options.binaryPropertyName}${count}`;
				}

				returnItem.binary![binaryPropertyName] = await context.nodeHelpers.copyBinaryFile(
					file.filepath,
					file.originalFilename ?? file.newFilename,
					file.mimetype,
				);

				// Delete original file to prevent tmp directory from growing too large
				await rm(file.filepath, { force: true });

				count += 1;
			}
		}

		return { workflowData: prepareOutput(returnItem) };
	}

	private async handleBinaryData(
		context: IWebhookFunctions,
		prepareOutput: (data: INodeExecutionData) => INodeExecutionData[][],
	): Promise<IWebhookResponseData> {
		const req = context.getRequestObject();
		const options = context.getNodeParameter('options', {}) as IDataObject;

		// TODO: create empty binaryData placeholder, stream into that path, and then finalize the binaryData
		const binaryFile = await tmpFile({ prefix: 'n8n-webhook-' });

		try {
			await pipeline(req, createWriteStream(binaryFile.path));

			const returnItem: INodeExecutionData = {
				json: {
					headers: req.headers,
					params: req.params,
					query: req.query,
					body: {},
				},
			};

			const stats = await stat(binaryFile.path);
			if (stats.size) {
				const binaryPropertyName = (options.binaryPropertyName ?? 'data') as string;
				const fileName = req.contentDisposition?.filename ?? uuid();
				const binaryData = await context.nodeHelpers.copyBinaryFile(
					binaryFile.path,
					fileName,
					req.contentType ?? 'application/octet-stream',
				);
				returnItem.binary = { [binaryPropertyName]: binaryData };
			}

			return { workflowData: prepareOutput(returnItem) };
		} catch (error) {
			throw new NodeOperationError(context.getNode(), error as Error);
		} finally {
			await binaryFile.cleanup();
		}
	}
}
