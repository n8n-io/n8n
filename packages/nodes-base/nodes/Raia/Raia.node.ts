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
		description: 'Raia Chat Agency API',
		defaults: {
			name: 'Raia',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Conversation Type',
				name: 'conversationType',
				type: 'options',
				options: [
					{ name: 'Raia Managed', value: 'raiaManaged' },
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

		if (conversationType === 'raiaManaged' || conversationType === 'customerManaged') {
			options.url = 'https://api.raia2.com/external/conversations/start';
			options.body = {
				firstName: this.getNodeParameter('firstName', 0),
				lastName: this.getNodeParameter('lastName', 0),
				context: this.getNodeParameter('context', 0),
				source: this.getNodeParameter('source', 0),
				fkId: '123456', // hardcoded for now, you can make dynamic later
				fkUserId: '123456',
				phoneNumber: this.getNodeParameter('phoneNumber', 0),
				email: this.getNodeParameter('email', 0),
				emailSubject: 'New Conversation',
				emailIntroduction: 'New Conversation',
				includeSignatureInEmail: false,
			};
		} else if (conversationType === 'oneOffMessage') {
			options.url = 'https://api.raia2.com/external/prompts';
			options.body = {
				prompt: this.getNodeParameter('prompt', 0),
			};
		} else {
			throw new ApplicationError('Invalid conversation type selected');
		}

		try {
			const responseData = await this.helpers.httpRequest(options);

			return {
				manualTriggerFunction: async () => {
					console.log('Request succeeded! ✅');
					console.log(responseData);
				},
			};
		} catch (error) {
			this.logger.error(`Request failed ❌: ${(error as Error).message}`, { title: 'Raia API' });
			throw new NodeApiError(this.getNode(), error);
		}
	}
}
