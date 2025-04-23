import type {
	ITriggerFunctions,
	ITriggerResponse,
	INodeType,
	INodeTypeDescription,
	IHttpRequestMethods,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';
import { ApplicationError, NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

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
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
				displayName: 'User Message',
				name: 'userMessage',
				type: 'string',
				default: '',
				description: 'Message to send to the AI Agent',
				displayOptions: {
					show: {
						conversationType: ['raiaManaged', 'customerManaged'],
					},
				},
			},
			{
				displayName: 'Continue Conversation',
				name: 'continueConversation',
				type: 'boolean',
				default: false,
				description: 'Whether to continue the conversation after receiving a reply',
				displayOptions: {
					show: {
						conversationType: ['raiaManaged', 'customerManaged'],
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnItems = [];
		const conversationType = this.getNodeParameter('conversationType', 0) as string;
		const credentials = (await this.getCredentials('raiaApi')) as { apiKey: string };

		const headers = {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			'Agent-Secret-Key': credentials.apiKey,
		};

		try {
			if (conversationType === 'raiaManaged' || conversationType === 'customerManaged') {
				let conversationId: string;

				if (conversationType === 'raiaManaged') {
					const phoneNumber = this.getNodeParameter('phoneNumber', 0);
					if (!(phoneNumber as string).startsWith('+')) {
						throw new ApplicationError('Phone number must start with a "+" (e.g., +1234567890).');
					}
					const response = await this.helpers.httpRequest({
						method: 'POST',
						url: 'https://api.raia2.com/external/conversations/start',
						headers,
						body: {
							firstName: this.getNodeParameter('firstName', 0),
							lastName: this.getNodeParameter('lastName', 0),
							context: this.getNodeParameter('context', 0),
							source: this.getNodeParameter('source', 0),
							channel: this.getNodeParameter('channel', 0),
							phoneNumber,
							email: this.getNodeParameter('email', 0),
							emailSubject: this.getNodeParameter('emailSubject', 0),
							emailIntroduction: this.getNodeParameter('emailIntroduction', 0),
							includeSignatureInEmail: this.getNodeParameter('includeSignatureInEmail', 0),
						},
						json: true,
					});
					conversationId = response.conversationId;
				} else {
					const userResponse = await this.helpers.httpRequest({
						method: 'POST',
						url: 'https://api.raia2.com/external/users',
						headers,
						body: {
							firstName: this.getNodeParameter('firstName', 0),
							lastName: this.getNodeParameter('lastName', 0),
							phoneNumber: this.getNodeParameter('phoneNumber', 0),
							email: this.getNodeParameter('email', 0),
						},
						json: true,
					});
					const conversationUserId = userResponse.id;

					const conversationResponse = await this.helpers.httpRequest({
						method: 'POST',
						url: 'https://api.raia2.com/external/conversations',
						headers,
						body: {
							conversationUserId,
							title: 'New Conversation Title',
						},
						json: true,
					});
					conversationId = conversationResponse.id;
				}

				let continueConversation = true; // Flag to control the loop

				while (continueConversation) {
					const userMessage = this.getNodeParameter('userMessage', 0);
					console.log(`Sending message: ${userMessage}`);

					// Send the user's message to the conversation
					const messageResponse = await this.helpers.httpRequest({
						method: 'POST',
						url: `https://api.raia2.com/external/conversations/${conversationId}/messages`,
						headers,
						body: {
							message: userMessage,
						},
						json: true,
					});

					console.log(`Agent Reply: ${messageResponse.message}`);

					// Return the conversationId, userMessage, and agentReply
					returnItems.push({
						json: {
							conversationId,
							userMessage,
							agentReply: messageResponse.message,
						},
					});

					// Check if the user wants to continue the conversation
					continueConversation = !!this.getNodeParameter('continueConversation', 0, false);
					if (!continueConversation) {
						console.log('Ending conversation as per user request.');
						break;
					}

					// Optional: Add a delay between messages to avoid overwhelming the API
					await new Promise((resolve) => setTimeout(resolve, 1000)); // 1-second delay
				}

				return [returnItems];
			} else if (conversationType === 'oneOffMessage') {
				const responseData = await this.helpers.httpRequest({
					method: 'POST',
					url: 'https://api.raia2.com/external/prompts',
					headers,
					body: {
						prompt: this.getNodeParameter('prompt', 0),
					},
					json: true,
				});

				return [
					[
						{
							json: responseData,
						},
					],
				];
			} else {
				throw new ApplicationError('Invalid conversation type selected');
			}
		} catch (error) {
			console.log(error);
			throw new NodeApiError(this.getNode(), error);
		}
	}
}
