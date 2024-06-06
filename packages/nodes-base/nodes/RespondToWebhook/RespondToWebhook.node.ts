import type { Readable } from 'stream';
import type {
	IDataObject,
	IExecuteFunctions,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { jsonParse, BINARY_ENCODING, NodeOperationError } from 'n8n-workflow';
import set from 'lodash/set';
import jwt from 'jsonwebtoken';
import { formatPrivateKey, generatePairedItemData } from '../../utils/utilities';

export class RespondToWebhook implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Respond to Webhook',
		icon: { light: 'file:webhook.svg', dark: 'file:webhook.dark.svg' },
		name: 'respondToWebhook',
		group: ['transform'],
		version: [1, 1.1],
		description: 'Returns data for Webhook',
		defaults: {
			name: 'Respond to Webhook',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'jwtAuth',
				required: true,
				displayOptions: {
					show: {
						respondWith: ['jwt'],
					},
				},
			},
		],
		properties: [
			{
				displayName:
					'Verify that the "Webhook" node\'s "Respond" parameter is set to "Using Respond to Webhook Node". <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/" target="_blank">More details',
				name: 'generalNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Respond With',
				name: 'respondWith',
				type: 'options',
				options: [
					{
						name: 'All Incoming Items',
						value: 'allIncomingItems',
						description: 'Respond with all input JSON items',
					},
					{
						name: 'Binary File',
						value: 'binary',
						description: 'Respond with incoming file binary data',
					},
					{
						name: 'First Incoming Item',
						value: 'firstIncomingItem',
						description: 'Respond with the first input JSON item',
					},
					{
						name: 'JSON',
						value: 'json',
						description: 'Respond with a custom JSON body',
					},
					{
						name: 'JWT Token',
						value: 'jwt',
						description: 'Respond with a JWT token',
					},
					{
						name: 'No Data',
						value: 'noData',
						description: 'Respond with an empty body',
					},
					{
						name: 'Redirect',
						value: 'redirect',
						description: 'Respond with a redirect to a given URL',
					},
					{
						name: 'Text',
						value: 'text',
						description: 'Respond with a simple text message body',
					},
				],
				default: 'firstIncomingItem',
				description: 'The data that should be returned',
			},
			{
				displayName: 'Credentials',
				name: 'credentials',
				type: 'credentials',
				default: '',
				displayOptions: {
					show: {
						respondWith: ['jwt'],
					},
				},
			},
			{
				displayName:
					'When using expressions, note that this node will only run for the first item in the input data',
				name: 'webhookNotice',
				type: 'notice',
				displayOptions: {
					show: {
						respondWith: ['json', 'text', 'jwt'],
					},
				},
				default: '',
			},
			{
				displayName: 'Redirect URL',
				name: 'redirectURL',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						respondWith: ['redirect'],
					},
				},
				default: '',
				placeholder: 'e.g. http://www.n8n.io',
				description: 'The URL to redirect to',
				validateType: 'url',
			},
			{
				displayName: 'Response Body',
				name: 'responseBody',
				type: 'json',
				displayOptions: {
					show: {
						respondWith: ['json'],
					},
				},
				default: '{\n  "myField": "value"\n}',
				typeOptions: {
					rows: 4,
				},
				description: 'The HTTP response JSON data',
			},
			{
				displayName: 'Payload',
				name: 'payload',
				type: 'json',
				displayOptions: {
					show: {
						respondWith: ['jwt'],
					},
				},
				default: '{\n  "myField": "value"\n}',
				typeOptions: {
					rows: 4,
				},
				validateType: 'object',
				description: 'The payload to include in the JWT token',
			},
			{
				displayName: 'Response Body',
				name: 'responseBody',
				type: 'string',
				displayOptions: {
					show: {
						respondWith: ['text'],
					},
				},
				typeOptions: {
					rows: 2,
				},
				default: '',
				placeholder: 'e.g. Workflow completed',
				description: 'The HTTP response text data',
			},
			{
				displayName: 'Response Data Source',
				name: 'responseDataSource',
				type: 'options',
				displayOptions: {
					show: {
						respondWith: ['binary'],
					},
				},
				options: [
					{
						name: 'Choose Automatically From Input',
						value: 'automatically',
						description: 'Use if input data will contain a single piece of binary data',
					},
					{
						name: 'Specify Myself',
						value: 'set',
						description: 'Enter the name of the input field the binary data will be in',
					},
				],
				default: 'automatically',
			},
			{
				displayName: 'Input Field Name',
				name: 'inputFieldName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: {
					show: {
						respondWith: ['binary'],
						responseDataSource: ['set'],
					},
				},
				description: 'The name of the node input field with the binary data',
			},

			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Response Code',
						name: 'responseCode',
						type: 'number',
						typeOptions: {
							minValue: 100,
							maxValue: 599,
						},
						default: 200,
						description: 'The HTTP response code to return. Defaults to 200.',
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
						displayName: 'Put Response in Field',
						name: 'responseKey',
						type: 'string',
						displayOptions: {
							show: {
								['/respondWith']: ['allIncomingItems', 'firstIncomingItem'],
							},
						},
						default: '',
						description: 'The name of the response field to put all items in',
						placeholder: 'e.g. data',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const nodeVersion = this.getNode().typeVersion;

		const WEBHOOK_NODE_TYPES = ['n8n-nodes-base.webhook', 'n8n-nodes-base.formTrigger'];

		try {
			if (nodeVersion >= 1.1) {
				const connectedNodes = this.getParentNodes(this.getNode().name);
				if (!connectedNodes.some(({ type }) => WEBHOOK_NODE_TYPES.includes(type))) {
					throw new NodeOperationError(
						this.getNode(),
						new Error('No Webhook node found in the workflow'),
						{
							description:
								'Insert a Webhook node to your workflow and set the “Respond” parameter to “Using Respond to Webhook Node” ',
						},
					);
				}
			}

			const respondWith = this.getNodeParameter('respondWith', 0) as string;
			const options = this.getNodeParameter('options', 0, {});

			const headers = {} as IDataObject;
			if (options.responseHeaders) {
				for (const header of (options.responseHeaders as IDataObject).entries as IDataObject[]) {
					if (typeof header.name !== 'string') {
						header.name = header.name?.toString();
					}
					headers[header.name?.toLowerCase() as string] = header.value?.toString();
				}
			}

			let statusCode = (options.responseCode as number) || 200;
			let responseBody: IN8nHttpResponse | Readable;
			if (respondWith === 'json') {
				const responseBodyParameter = this.getNodeParameter('responseBody', 0) as string;
				if (responseBodyParameter) {
					if (typeof responseBodyParameter === 'object') {
						responseBody = responseBodyParameter;
					} else {
						try {
							responseBody = jsonParse(responseBodyParameter);
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error as Error, {
								message: "Invalid JSON in 'Response Body' field",
								description:
									"Check that the syntax of the JSON in the 'Response Body' parameter is valid",
							});
						}
					}
				}
			} else if (respondWith === 'jwt') {
				try {
					const { keyType, secret, algorithm, privateKey } = (await this.getCredentials(
						'jwtAuth',
					)) as {
						keyType: 'passphrase' | 'pemKey';
						privateKey: string;
						secret: string;
						algorithm: jwt.Algorithm;
					};

					let secretOrPrivateKey;

					if (keyType === 'passphrase') {
						secretOrPrivateKey = secret;
					} else {
						secretOrPrivateKey = formatPrivateKey(privateKey);
					}
					const payload = this.getNodeParameter('payload', 0, {}) as IDataObject;
					const token = jwt.sign(payload, secretOrPrivateKey, { algorithm });
					responseBody = { token };
				} catch (error) {
					throw new NodeOperationError(this.getNode(), error as Error, {
						message: 'Error signing JWT token',
					});
				}
			} else if (respondWith === 'allIncomingItems') {
				const respondItems = items.map((item) => item.json);
				responseBody = options.responseKey
					? set({}, options.responseKey as string, respondItems)
					: respondItems;
			} else if (respondWith === 'firstIncomingItem') {
				responseBody = options.responseKey
					? set({}, options.responseKey as string, items[0].json)
					: items[0].json;
			} else if (respondWith === 'text') {
				responseBody = this.getNodeParameter('responseBody', 0) as string;
			} else if (respondWith === 'binary') {
				const item = items[0];

				if (item.binary === undefined) {
					throw new NodeOperationError(this.getNode(), 'No binary data exists on the first item!');
				}

				let responseBinaryPropertyName: string;

				const responseDataSource = this.getNodeParameter('responseDataSource', 0) as string;

				if (responseDataSource === 'set') {
					responseBinaryPropertyName = this.getNodeParameter('inputFieldName', 0) as string;
				} else {
					const binaryKeys = Object.keys(item.binary);
					if (binaryKeys.length === 0) {
						throw new NodeOperationError(
							this.getNode(),
							'No binary data exists on the first item!',
						);
					}
					responseBinaryPropertyName = binaryKeys[0];
				}

				const binaryData = this.helpers.assertBinaryData(0, responseBinaryPropertyName);
				if (binaryData.id) {
					responseBody = { binaryData };
				} else {
					responseBody = Buffer.from(binaryData.data, BINARY_ENCODING);
					headers['content-length'] = (responseBody as Buffer).length;
				}

				if (!headers['content-type']) {
					headers['content-type'] = binaryData.mimeType;
				}
			} else if (respondWith === 'redirect') {
				headers.location = this.getNodeParameter('redirectURL', 0) as string;
				statusCode = (options.responseCode as number) ?? 307;
			} else if (respondWith !== 'noData') {
				throw new NodeOperationError(
					this.getNode(),
					`The Response Data option "${respondWith}" is not supported!`,
				);
			}

			const response: IN8nHttpFullResponse = {
				body: responseBody,
				headers,
				statusCode,
			};

			this.sendResponse(response);
		} catch (error) {
			if (this.continueOnFail()) {
				const itemData = generatePairedItemData(items.length);
				const returnData = this.helpers.constructExecutionMetaData(
					[{ json: { error: error.message } }],
					{ itemData },
				);
				return [returnData];
			}

			throw error;
		}

		return [items];
	}
}
