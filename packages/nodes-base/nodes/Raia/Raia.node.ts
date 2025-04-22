import type {
	ITriggerFunctions,
	ITriggerResponse,
	INodeType,
	INodeTypeDescription,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { ApplicationError, NodeApiError } from 'n8n-workflow';

export class Raia implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'raia',
		name: 'raia',
		group: ['trigger'],
		version: 1,
		icon: 'file:raia.svg',
		description: 'raia Chat Agency API',
		defaults: {
			name: 'raia',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'raiaApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Conversation Type',
				name: 'conversationType',
				type: 'options',
				options: [
					{ name: 'raia Managed', value: 'raiaManaged' },
					{ name: 'Customer Managed', value: 'customerManaged' },
					{ name: 'One-Off AI Message', value: 'oneOffMessage' },
				],
				default: 'raiaManaged',
				description: 'Choose which type of conversation to start',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						conversationType: ['raiaManaged', 'customerManaged'],
					},
				},
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						conversationType: ['raiaManaged', 'customerManaged'],
					},
				},
			},
			{
				displayName: 'Context',
				name: 'context',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						conversationType: ['raiaManaged', 'customerManaged'],
					},
				},
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'string',
				default: 'webchat',
				displayOptions: {
					show: {
						conversationType: ['raiaManaged', 'customerManaged'],
					},
				},
			},
			{
				displayName: 'Phone Number',
				name: 'phoneNumber',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						conversationType: ['raiaManaged', 'customerManaged'],
					},
				},
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				displayOptions: {
					show: {
						conversationType: ['raiaManaged', 'customerManaged'],
					},
				},
			},
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'options',
				options: [
					{ name: 'SMS', value: 'sms' },
					{ name: 'Email', value: 'email' },
					{ name: 'Voice', value: 'voice' },
				],
				default: 'email',
				description: 'The communication channel to use',
				displayOptions: {
					show: {
						conversationType: ['raiaManaged', 'customerManaged'],
					},
				},
			},
			{
				displayName: 'Email Subject',
				name: 'emailSubject',
				type: 'string',
				default: 'New Conversation',
				displayOptions: {
					show: {
						conversationType: ['raiaManaged', 'customerManaged'],
						channel: ['email'],
					},
				},
			},
			{
				displayName: 'Email Introduction',
				name: 'emailIntroduction',
				type: 'string',
				default: 'New Conversation',
				displayOptions: {
					show: {
						conversationType: ['raiaManaged', 'customerManaged'],
						channel: ['email'],
					},
				},
			},
			{
				displayName: 'Include Signature in Email',
				name: 'includeSignatureInEmail',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						conversationType: ['raiaManaged', 'customerManaged'],
						channel: ['email'],
					},
				},
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						conversationType: ['oneOffMessage'],
					},
				},
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse | undefined> {
		const conversationType = this.getNodeParameter('conversationType', 0) as string;
		const credentials = (await this.getCredentials('raiaApi')) as { apiKey: string };

		const options: {
			method: string;
			url: string;
			headers: { [key: string]: string };
			body: any;
			json: boolean;
		} = {
			method: 'POST' as IHttpRequestMethods,
			url: '',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'Agent-Secret-Key': String(credentials.apiKey),
			},
			body: {},
			json: true,
		};

		try {
			if (conversationType === 'raiaManaged' || conversationType === 'customerManaged') {
				let conversationId: string;

				if (conversationType === 'raiaManaged') {
					// Validate phone number
					const phoneNumber = this.getNodeParameter('phoneNumber', 0);
					if (!(phoneNumber as string).startsWith('+')) {
						throw new ApplicationError('Phone number must start with a "+" (e.g., +1234567890).');
					}

					// Raia-Managed Conversation: Start the conversation directly
					options.url = 'https://api.raia2.com/external/conversations/start';
					options.body = {
						firstName: this.getNodeParameter('firstName', 0),
						lastName: this.getNodeParameter('lastName', 0),
						context: this.getNodeParameter('context', 0),
						source: this.getNodeParameter('source', 0),
						channel: this.getNodeParameter('channel', 0),
						phoneNumber, // Validated phone number
						email: this.getNodeParameter('email', 0),
						emailSubject: this.getNodeParameter('emailSubject', 0),
						emailIntroduction: this.getNodeParameter('emailIntroduction', 0),
						includeSignatureInEmail: this.getNodeParameter('includeSignatureInEmail', 0),
					};

					console.log('Payload for /conversations/start:', options.body);

					const responseData = await this.helpers.httpRequest({
						...options,
						method: options.method as IHttpRequestMethods,
					});
					conversationId = responseData.conversationId;
					if (!conversationId) {
						throw new ApplicationError(
							'conversationId is missing in the response from /conversations/start.',
						);
					}
					console.log(
						`Raia-Managed Conversation started successfully! Conversation ID: ${conversationId}`,
					);
				} else if (conversationType === 'customerManaged') {
					// Customer-Managed Conversation: Create user and conversation

					// Step 1: Create a User
					const createUserOptions = {
						method: 'POST' as IHttpRequestMethods,
						url: 'https://api.raia2.com/external/users',
						headers: options.headers,
						body: {
							firstName: this.getNodeParameter('firstName', 0),
							lastName: this.getNodeParameter('lastName', 0),
							phoneNumber: this.getNodeParameter('phoneNumber', 0),
							email: this.getNodeParameter('email', 0),
						},
						json: true,
					};

					console.log('Payload for /users:', createUserOptions.body);

					const userResponse = await this.helpers.httpRequest(createUserOptions);
					const conversationUserId = userResponse.id;
					if (!conversationUserId) {
						throw new ApplicationError(
							'conversationUserId is missing in the response from /users.',
						);
					}
					console.log(`User created successfully! Conversation User ID: ${conversationUserId}`);

					// Step 2: Create a Conversation
					const createConversationOptions = {
						method: 'POST' as IHttpRequestMethods,
						url: 'https://api.raia2.com/external/conversations',
						headers: options.headers,
						body: {
							conversationUserId,
							title: 'New Conversation Title',
						},
						json: true,
					};

					console.log('Payload for /conversations:', createConversationOptions.body);

					const conversationResponse = await this.helpers.httpRequest(createConversationOptions);
					conversationId = conversationResponse.id;
					if (!conversationId) {
						throw new ApplicationError(
							'conversationId is missing in the response from /conversations.',
						);
					}
					console.log(`Conversation created successfully! Conversation ID: ${conversationId}`);
				}

				// Continuous conversation logic
				while (true) {
					const message = this.getNodeParameter('prompt', 'Hello');
					const addMessageOptions = {
						method: 'POST' as IHttpRequestMethods,
						url: `https://api.raia2.com/external/conversations/${conversationId}/messages`,
						headers: options.headers,
						body: {
							message,
						},
						json: true,
					};

					console.log(
						'Payload for /conversations/{conversationId}/messages:',
						addMessageOptions.body,
					);

					const messageResponse = await this.helpers.httpRequest(addMessageOptions);
					console.log('Message sent successfully! Agent Response:', messageResponse);

					// Log the Agent's reply
					const agentReply = messageResponse.message;
					console.log(`Agent Reply: ${agentReply}`);

					// Break the loop if no further messages are required
					const continueConversation = this.getNodeParameter('continueConversation', 0);
					if (!continueConversation) {
						break;
					}
				}

				return {
					manualTriggerFunction: async () => {
						console.log('Conversation completed successfully! ✅');
					},
				};
			} else if (conversationType === 'oneOffMessage') {
				options.url = 'https://api.raia2.com/external/prompts';
				options.body = {
					prompt: this.getNodeParameter('prompt', 0),
				};

				console.log('Payload for /prompts:', options.body);

				const responseData = await this.helpers.httpRequest({
					...options,
					method: options.method as IHttpRequestMethods,
				});
				console.log('One-Off Message sent successfully!', responseData);

				return {
					manualTriggerFunction: async () => {
						console.log('One-Off Message completed successfully! ✅');
						console.log(responseData);
					},
				};
			} else {
				throw new ApplicationError('Invalid conversation type selected');
			}
		} catch (error) {
			console.error('Error occurred during API request:', error);
			throw new NodeApiError(this.getNode(), error, {
				message: 'An error occurred while processing the request.',
			});
		}
	}
}
