import {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';

export class LEDGERS implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LEDGERS',
		name: 'LEDGERS',
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
                options: [
                    {
                        name: 'Create Contact',
                        value: 'createContact',
                    },
                    {
                        name: 'Update Contact',
                        value: 'updateContact',
                    },
                    {
                        name: 'Get Contact',
                        value: 'getContact',
                    },
                    {
                        name: 'Get All Contacts',
                        value: 'getAllContacts',
                    },
                ],
                default: 'createContact',
            },
            // Create Contact Section
            {
                displayName: 'Contact Name',
                name: 'contactName',
                type: 'string',
                displayOptions: {
                    show: {
                        operation: ['createContact'],
                    },
                },
                required: true,
                default: '',
                description: 'The name of the new contact',
            },
            {
                displayName: 'Additional Fields (Create)',
                name: 'additionalFieldsCreate',
                type: 'collection',
                displayOptions: {
                    show: {
                        operation: ['createContact'],
                    },
                },
                default: {},
                placeholder: 'Add Field',
                options: [
                    {
                        displayName: 'Email',
                        name: 'email',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Mobile',
                        name: 'mobile',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Address',
                        name: 'address',
                        type: 'string',
                        default: '',
                    },
                ],
            },
            // Update Contact Section
            {
                displayName: 'Contact ID',
                name: 'contactId',
                type: 'string',
                displayOptions: {
                    show: {
                        operation: ['updateContact', 'getContact'],
                    },
                },
                required: true,
                default: '',
                description: 'The ID of the contact to update or fetch',
            },
            {
                displayName: 'Update Fields',
                name: 'updateFields',
                type: 'collection',
                displayOptions: {
                    show: {
                        operation: ['updateContact'],
                    },
                },
                default: {},
                placeholder: 'Add Field',
                options: [
                    {
                        displayName: 'Contact Name',
                        name: 'contact_name',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Email',
                        name: 'email',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Mobile',
                        name: 'mobile',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Address',
                        name: 'address',
                        type: 'string',
                        default: '',
                    },
                ],
            },
            // Get All Contacts Section
            {
                displayName: 'Limit (Per Page)',
                name: 'perPage',
                type: 'number',
                displayOptions: {
                    show: {
                        operation: ['getAllContacts'],
                    },
                },
                default: 5,
                description: 'Number of contacts per page',
            },         
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('LEDGERSApi') as IDataObject;
		const operation = this.getNodeParameter('operation', 0) as string;

		// First: Login to get API Token
		const loginResponse = await this.helpers.httpRequest({
			method: 'POST',
			url: 'https://in-api-dev.ledgers.cloud/login',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': credentials.xApiKey as string,
			},
			body: {
				email: credentials.email,
				password: credentials.password,
			},
			json: true,
		});

		if (!loginResponse.api_token) {
			throw new Error('Login failed, could not fetch api_token.');
		}

		const apiToken = loginResponse.api_token as string;

		for (let i = 0; i < items.length; i++) {
			let options: IDataObject = {};
			let url = '';
			let method: IHttpRequestMethods = 'GET';
			let body: IDataObject = {};

			if (operation === 'createContact') {
				const contactName = this.getNodeParameter('contactName', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

				body = {
					contact_name: contactName,
					...additionalFields,
				};

				// Mobile format
				if (body.mobile) {
					body.mobile = `${body.mobile}|in`;
					body.mobile_country_code = '+91';
				}

				url = 'https://in-api-dev.ledgers.cloud/v3/contact';
				method = 'POST';

			} else if (operation === 'updateContact') {
				const contactId = this.getNodeParameter('contactId', i) as string;
				const updateFields = this.getNodeParameter('additionalFields', i) as IDataObject;

				body = {
					contact_id: contactId,
					...updateFields,
				};

				if (body.mobile) {
					body.mobile = `${body.mobile}|in`;
					body.mobile_country_code = '+91';
				}

				url = 'https://in-api-dev.ledgers.cloud/v3/contact';
				method = 'PUT';

			} else if (operation === 'getContact') {
				const contactId = this.getNodeParameter('contactId', i) as string;
				url = `https://in-api-dev.ledgers.cloud/v3/contact/${contactId}`;
				method = 'GET';

			} else if (operation === 'getAllContacts') {
				const perPage = this.getNodeParameter('perPage', i) as number;
				url = `https://in-api-dev.ledgers.cloud/v3/contact?perpage=${perPage}`;
				method = 'GET';
			}

			const requestOptions: IHttpRequestOptions = {
				method,
				url,
				headers: {
					'Content-Type': 'application/json',
					'api-token': apiToken,
					'x-api-key': credentials.xApiKey,
				},
				json: true,
			};

			if (method !== 'GET') {
				requestOptions.body = body;
			}

			const response = await this.helpers.httpRequest(requestOptions);

			returnData.push({
				json: response,
			});
		}

		return [returnData];
	}
}
