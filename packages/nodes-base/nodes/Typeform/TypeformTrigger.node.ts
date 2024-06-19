import type {
	IHookFunctions,
	IWebhookFunctions,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import type {
	ITypeformAnswer,
	ITypeformAnswerField,
	ITypeformDefinition,
} from './GenericFunctions';
import { apiRequest, getForms } from './GenericFunctions';

export class TypeformTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Typeform Trigger',
		name: 'typeformTrigger',
		icon: { light: 'file:typeform.svg', dark: 'file:typeform.dark.svg' },
		group: ['trigger'],
		version: [1, 1.1],
		subtitle: '=Form ID: {{$parameter["formId"]}}',
		description: 'Starts the workflow on a Typeform form submission',
		defaults: {
			name: 'Typeform Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'typeformApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['accessToken'],
					},
				},
				testedBy: 'testTypeformTokenAuth',
			},
			{
				name: 'typeformOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
			},
			{
				displayName: 'Form Name or ID',
				name: 'formId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getForms',
				},
				options: [],
				default: '',
				required: true,
				description:
					'Form which should trigger workflow on submission. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Simplify Answers',
				name: 'simplifyAnswers',
				type: 'boolean',
				default: true,

				description:
					'Whether to convert the answers to a key:value pair ("FIELD_TITLE":"USER_ANSER") to be easily processable',
			},
			{
				displayName: 'Only Answers',
				name: 'onlyAnswers',
				type: 'boolean',
				default: true,
				description: 'Whether to return only the answers of the form and not any of the other data',
			},
		],
	};

	methods = {
		loadOptions: {
			getForms,
		},
		credentialTest: {
			async testTypeformTokenAuth(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data;

				const options = {
					headers: {
						authorization: `bearer ${credentials!.accessToken}`,
					},
					uri: 'https://api.typeform.com/workspaces',
					json: true,
				};
				try {
					const response = await this.helpers.request(options);
					if (!response.items) {
						return {
							status: 'Error',
							message: 'Token is not valid.',
						};
					}
				} catch (err) {
					return {
						status: 'Error',
						message: `Token is not valid; ${err.message}`,
					};
				}

				return {
					status: 'OK',
					message: 'Authentication successful!',
				};
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');

				const formId = this.getNodeParameter('formId') as string;

				const endpoint = `forms/${formId}/webhooks`;

				const { items } = await apiRequest.call(this, 'GET', endpoint, {});

				for (const item of items) {
					if (item.form_id === formId && item.url === webhookUrl) {
						webhookData.webhookId = item.tag;
						return true;
					}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');

				const formId = this.getNodeParameter('formId') as string;
				const webhookId = 'n8n-' + Math.random().toString(36).substring(2, 15);

				const endpoint = `forms/${formId}/webhooks/${webhookId}`;

				// TODO: Add HMAC-validation once either the JSON data can be used for it or there is a way to access the binary-payload-data
				const body = {
					url: webhookUrl,
					enabled: true,
					verify_ssl: true,
				};

				await apiRequest.call(this, 'PUT', endpoint, body);

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = webhookId;

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const formId = this.getNodeParameter('formId') as string;

				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					const endpoint = `forms/${formId}/webhooks/${webhookData.webhookId}`;

					try {
						const body = {};
						await apiRequest.call(this, 'DELETE', endpoint, body);
					} catch (error) {
						return false;
					}
					// Remove from the static workflow data so that it is clear
					// that no webhooks are registered anymore
					delete webhookData.webhookId;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const version = this.getNode().typeVersion;
		const bodyData = this.getBodyData();

		const simplifyAnswers = this.getNodeParameter('simplifyAnswers') as boolean;
		const onlyAnswers = this.getNodeParameter('onlyAnswers') as boolean;

		if (
			bodyData.form_response === undefined ||
			(bodyData.form_response as IDataObject).definition === undefined ||
			(bodyData.form_response as IDataObject).answers === undefined
		) {
			throw new NodeApiError(this.getNode(), bodyData as JsonObject, {
				message: 'Expected definition/answers data is missing!',
			});
		}

		const answers = (bodyData.form_response as IDataObject).answers as ITypeformAnswer[];

		// Some fields contain lower level fields of which we are only interested of the values
		const subValueKeys = ['label', 'labels'];

		if (simplifyAnswers) {
			// Convert the answers to simple key -> value pairs
			const definition = (bodyData.form_response as IDataObject).definition as ITypeformDefinition;

			// Create a dictionary to get the field title by its ID
			const definitionsById: { [key: string]: string } = {};
			for (const field of definition.fields) {
				definitionsById[field.id] = field.title.replace(/\{\{/g, '[').replace(/\}\}/g, ']');
			}

			// Convert the answers to key -> value pair
			const convertedAnswers: IDataObject = {};
			for (const answer of answers) {
				let value = answer[answer.type];
				if (typeof value === 'object') {
					for (const key of subValueKeys) {
						if ((value as IDataObject)[key] !== undefined) {
							value = (value as ITypeformAnswerField)[key];
							break;
						}
					}
				}
				convertedAnswers[definitionsById[answer.field.id]] = value;
			}

			if (onlyAnswers) {
				// Only the answers should be returned so do it directly
				return {
					workflowData: [this.helpers.returnJsonArray([convertedAnswers])],
				};
			} else {
				// All data should be returned but the answers should still be
				// converted to key -> value pair so overwrite the answers.
				(bodyData.form_response as IDataObject).answers = convertedAnswers;
			}
		}

		if (onlyAnswers) {
			// Return only the answers
			if (version >= 1.1) {
				return {
					workflowData: [
						this.helpers.returnJsonArray([
							answers.reduce(
								(acc, answer) => {
									acc[answer.field.id] = answer;
									return acc;
								},
								{} as Record<string, ITypeformAnswer>,
							),
						]),
					],
				};
			}

			return {
				workflowData: [this.helpers.returnJsonArray([answers as unknown as IDataObject])],
			};
		} else {
			// Return all the data that got received
			return {
				workflowData: [this.helpers.returnJsonArray([bodyData])],
			};
		}
	}
}
