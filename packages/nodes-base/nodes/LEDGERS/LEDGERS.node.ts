import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
	IDataObject,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export class Ledgers implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LEDGERS',
		name: 'LEDGERS',
		icon: 'file:LEDGERS.svg',
		group: ['input'],
		version: 1,
		description: 'Interact with LEDGERS API',
		defaults: {
			name: 'LEDGERS',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'LEDGERSApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create Contact',
						value: 'createContact',
						description: 'Create a new contact',
						action: 'Create a new contact',
					},
					{
						name: 'Update Contact',
						value: 'updateContact',
						description: 'Update an existing contact',
						action: 'Update an existing contact',
					},
					{
						name: 'Get Contact',
						value: 'getContact',
						description: 'Get a contact by ID',
						action: 'Get a contact by ID',
					},
					{
						name: 'Get All Contacts',
						value: 'getAllContacts',
						description: 'Get list of contacts',
						action: 'Get list of contacts',
					},
				],
				default: 'createContact',
			},
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['updateContact', 'getContact'],
					},
				},
				required: true,
				description: 'The ID of the contact (for update or get)',
			},
			{
				displayName: 'Contact Name',
				name: 'contactName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['createContact'],
					},
				},
				description: 'The name of the contact (for create)',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['createContact'],
					},
				},
				options: [
					{ displayName: 'Email', name: 'email', type: 'string', default: '', placeholder: '' },
					{ displayName: 'Mobile', name: 'mobile', type: 'string', default: '', placeholder: '' },
					{ displayName: 'GSTIN', name: 'gstin', type: 'string', default: '', placeholder: '' },
					{
						displayName: 'Business Name',
						name: 'business_name',
						type: 'string',
						default: '',
						placeholder: '',
					},
					{
						displayName: 'Billing Address 1',
						name: 'billing_address1',
						type: 'string',
						default: '',
						placeholder: '',
					},
					{
						displayName: 'Billing Address 2',
						name: 'billing_address2',
						type: 'string',
						default: '',
					},
					{ displayName: 'City', name: 'location', type: 'string', default: '', placeholder: '' },
				],
			},
			{
				displayName: 'Update Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['updateContact'],
					},
				},
				options: [
					{
						displayName: 'Contact Name',
						name: 'contact_name',
						type: 'string',
						default: '',
						placeholder: '',
					},
					{ displayName: 'Email', name: 'email', type: 'string', default: '', placeholder: '' },
					{ displayName: 'Mobile', name: 'mobile', type: 'string', default: '', placeholder: '' },
					{ displayName: 'GSTIN', name: 'gstin', type: 'string', default: '', placeholder: '' },
					{
						displayName: 'Business Name',
						name: 'business_name',
						type: 'string',
						default: '',
						placeholder: '',
					},
					{
						displayName: 'Billing Address 1',
						name: 'billing_address1',
						type: 'string',
						default: '',
						placeholder: '',
					},
					{
						displayName: 'Billing Address 2',
						name: 'billing_address2',
						type: 'string',
						default: '',
						placeholder: '',
					},
					{ displayName: 'City', name: 'location', type: 'string', default: '', placeholder: '' },
				],
			},
			{
				displayName: 'Limit (Per Page)',
				name: 'perPage',
				type: 'number',
				default: 5,
				displayOptions: {
					show: {
						operation: ['getAllContacts'],
					},
				},
				description: 'Number of contacts per page',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('LEDGERSApi');
		const operation = this.getNodeParameter('operation', 0) as string;

		// Always fresh login
		const loginOptions = {
			method: 'POST',
			url: 'https://in-api-dev.ledgers.cloud/login',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': credentials.xApiKey,
			},
			body: {
				email: credentials.email,
				password: credentials.password,
			},
			json: true,
		};

		const loginResponse = await this.helpers.request(loginOptions);

		if (!loginResponse || !loginResponse.api_token) {
			throw new NodeOperationError(
				this.getNode(),
				'Login failed during operation. Check credentials.',
			);
		}

		const apiToken = loginResponse.api_token;

		for (let i = 0; i < items.length; i++) {
			let options: IDataObject = {};

			if (operation === 'createContact') {
				const contactName = this.getNodeParameter('contactName', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

				const body: IDataObject = {
					contact_name: contactName,
					...additionalFields,
				};

				if (body.mobile) {
					body.mobile = `${body.mobile}|in`;
					body.mobile_country_code = '+91';
				}

				options = {
					method: 'POST',
					url: 'https://in-api-dev.ledgers.cloud/v3/contact',
					headers: {
						'api-token': apiToken,
						'x-api-key': credentials.xApiKey,
						'Content-Type': 'application/json',
					},
					body,
					json: true,
				};
			} else if (operation === 'updateContact') {
				const contactId = this.getNodeParameter('contactId', i) as string;
				const updateFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

				const body: IDataObject = {
					contact_id: contactId,
					...updateFields,
				};

				if (body.mobile) {
					body.mobile = `${body.mobile}|in`;
					body.mobile_country_code = '+91';
				}

				options = {
					method: 'PUT',
					url: 'https://in-api-dev.ledgers.cloud/v3/contact',
					headers: {
						'api-token': apiToken,
						'x-api-key': credentials.xApiKey,
						'Content-Type': 'application/json',
					},
					body,
					json: true,
				};
			} else if (operation === 'getContact') {
				const contactId = this.getNodeParameter('contactId', i) as string;

				options = {
					method: 'GET',
					url: `https://in-api-dev.ledgers.cloud/v3/contact/${contactId}`,
					headers: {
						'api-token': apiToken,
						'x-api-key': credentials.xApiKey,
					},
					json: true,
				};
			} else if (operation === 'getAllContacts') {
				const perPage = this.getNodeParameter('perPage', i) as number;

				options = {
					method: 'GET',
					url: `https://in-api-dev.ledgers.cloud/v3/contact?perpage=${perPage}`,
					headers: {
						'api-token': apiToken,
						'x-api-key': credentials.xApiKey,
					},
					json: true,
				};
			}

			const response = (await this.helpers.httpRequest(options)) as IDataObject;
			returnData.push({ json: response });
		}

		return [returnData];
	}
}
