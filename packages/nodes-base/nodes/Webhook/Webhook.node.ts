/* eslint-disable n8n-nodes-base/node-execute-block-wrong-error-thrown */
import type {
	IWebhookFunctions,
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeExecutionData,
	INodeTypeDescription,
	IWebhookResponseData,
	MultiPartFormData,
} from 'n8n-workflow';
import { BINARY_ENCODING, NodeOperationError, Node } from 'n8n-workflow';

import fs from 'fs';
import stream from 'stream';
import { promisify } from 'util';
import { v4 as uuid } from 'uuid';
import basicAuth from 'basic-auth';
import isbot from 'isbot';
import { file as tmpFile } from 'tmp-promise';

import {
	authenticationProperty,
	credentialsProperty,
	defaultWebhookDescription,
	httpMethodsProperty,
	optionsProperty,
	responseBinaryPropertyNameProperty,
	responseCodeProperty,
	responseDataProperty,
	responseModeProperty,
} from './description';
import { WebhookAuthorizationError } from './error';

const pipeline = promisify(stream.pipeline);

export class Webhook extends Node {
	authPropertyName = 'authentication';

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
		credentials: credentialsProperty(this.authPropertyName),
		webhooks: [defaultWebhookDescription],
		properties: [
			authenticationProperty(this.authPropertyName),
			httpMethodsProperty,
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '',
				placeholder: 'webhook',
				required: true,
				description: 'The path to listen to',
			},
			responseModeProperty,
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
			responseCodeProperty,
			responseDataProperty,
			responseBinaryPropertyNameProperty,
			optionsProperty,
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

		if (req.contentType === 'multipart/form-data') {
			return this.handleFormData(context);
		}

		if (options.binaryData) {
			return this.handleBinaryData(context);
		}

		const mimeType = req.headers['content-type'] ?? 'application/json';
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
		const authentication = context.getNodeParameter(this.authPropertyName) as string;
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
		const req = context.getRequestObject() as MultiPartFormData.Request;
		const options = context.getNodeParameter('options', {}) as IDataObject;
		const { data, files } = req.body;

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
			const processFiles: MultiPartFormData.File[] = [];
			let multiFile = false;
			if (Array.isArray(files[xfile])) {
				processFiles.push(...(files[xfile] as MultiPartFormData.File[]));
				multiFile = true;
			} else {
				processFiles.push(files[xfile] as MultiPartFormData.File);
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
					fileJson.type,
				);

				count += 1;
			}
		}
		return { workflowData: [[returnItem]] };
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
					body: {},
				},
			};

			const binaryPropertyName = (options.binaryPropertyName || 'data') as string;
			const fileName = req.headers['content-disposition']?.split('filename=')[1] ?? uuid();
			returnItem.binary![binaryPropertyName] = await context.nodeHelpers.copyBinaryFile(
				binaryFile.path,
				fileName,
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
