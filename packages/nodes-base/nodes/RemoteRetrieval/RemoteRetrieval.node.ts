import {
	INodeExecutionData,
	IExecuteFunctions,
	IDataObject,
	INodeTypeDescription,
	INodeType,
	ICredentialDataDecryptedObject,
	IHttpRequestMethods,
} from 'n8n-workflow';

export class RemoteRetrieval implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Remote Retrieval',
		name: 'Remote Retrieval',
		icon: 'file:remoteretrieval.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume Remote Retrieval API',
		defaults: {
			name: 'Employee',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'RemoteRetrievalApi',
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
						name: 'Create Order',
						value: 'create',
					},
					{
						name: 'Get Orders',
						value: 'get_orders',
					},
					{
						name: 'Get Pending Orders',
						value: 'get_pending_orders',
					},
				],
				default: 'create',
				description: 'Select the operation to perform',
			},
			{
				displayName: 'Type of Equipment',
				name: 'type_of_equipment',
				type: 'options',
				default: '',
				required: true,
				description: 'Type of equipment being ordered.',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
				options: [
					{
						name: 'Laptop',
						value: 'Laptop',
					},
					{
						name: 'Monitor',
						value: 'Monitor',
					},
				],
			},
			{
				displayName: 'Order Type',
				name: 'order_type',
				type: 'options',
				required: true,
				default: '',
				description: 'The type of order.',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
				options: [
					{
						name: 'Sell this Equipment',
						value: 'sell_this_equipment',
					},
					{
						name: 'Return to Company',
						value: 'return_to_company',
					},
				],
			},
			// Employee Information
			{
				displayName: 'Employee Name',
				name: 'employee_name',
				type: 'string',
				default: '',
				required: true,
				description: 'Name of the employee.',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Employee Email',
				name: 'employee_email',
				type: 'string',
				default: '',
				required: true,
				description: 'Email of the employee.',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Employee Address',
				name: 'employee_address_line_1',
				type: 'string',
				default: '',
				description: 'Address Line 1 of the employee.',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Employee Address Line 2',
				name: 'employee_address_line_2',
				type: 'string',
				default: '',
				description: 'Address Line 2 of the employee.',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Employee City',
				name: 'employee_city',
				type: 'string',
				default: '',
				required: true,
				description: 'City where the employee is located.',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Employee State',
				name: 'employee_state',
				type: 'options',
				default: '',
				required: true,
				description: 'State where the employee is located.',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
				options: [
					{
						name: 'Alabama',
						value: 'AL',
					},
					{
						name: 'Alaska',
						value: 'AK',
					},
					{
						name: 'Arizona',
						value: 'AZ',
					},
					{
						name: 'Arkansas',
						value: 'AR',
					},
					{
						name: 'California',
						value: 'CA',
					},
					{
						name: 'Colorado',
						value: 'CO',
					},
					{
						name: 'Connecticut',
						value: 'CT',
					},
					{
						name: 'Delaware',
						value: 'DE',
					},
					{
						name: 'District Of Columbia',
						value: 'DC',
					},
					{
						name: 'Florida',
						value: 'FL',
					},
					{
						name: 'Georgia',
						value: 'GA',
					},
					{
						name: 'Hawaii',
						value: 'HI',
					},
					{
						name: 'Idaho',
						value: 'ID',
					},
					{
						name: 'Illinois',
						value: 'IL',
					},
					{
						name: 'Indiana',
						value: 'IN',
					},
					{
						name: 'Iowa',
						value: 'IA',
					},
					{
						name: 'Kansas',
						value: 'KS',
					},
					{
						name: 'Kentucky',
						value: 'KY',
					},
					{
						name: 'Louisiana',
						value: 'LA',
					},
					{
						name: 'Maine',
						value: 'ME',
					},
					{
						name: 'Maryland',
						value: 'MD',
					},
					{
						name: 'Massachusetts',
						value: 'MA',
					},
					{
						name: 'Michigan',
						value: 'MI',
					},
					{
						name: 'Minnesota',
						value: 'MN',
					},
					{
						name: 'Mississippi',
						value: 'MS',
					},
					{
						name: 'Missouri',
						value: 'MO',
					},
					{
						name: 'Montana',
						value: 'MT',
					},
					{
						name: 'Nebraska',
						value: 'NE',
					},
					{
						name: 'Nevada',
						value: 'NV',
					},
					{
						name: 'New Hampshire',
						value: 'NH',
					},
					{
						name: 'New Jersey',
						value: 'NJ',
					},
					{
						name: 'New Mexico',
						value: 'NM',
					},
					{
						name: 'New York',
						value: 'NY',
					},
					{
						name: 'North Carolina',
						value: 'NC',
					},
					{
						name: 'North Dakota',
						value: 'ND',
					},
					{
						name: 'Ohio',
						value: 'OH',
					},
					{
						name: 'Oklahoma',
						value: 'OK',
					},
					{
						name: 'Oregon',
						value: 'OR',
					},
					{
						name: 'Pennsylvania',
						value: 'PA',
					},
					{
						name: 'Rhode Island',
						value: 'RI',
					},
					{
						name: 'South Carolina',
						value: 'SC',
					},
					{
						name: 'South Dakota',
						value: 'SD',
					},
					{
						name: 'Tennessee',
						value: 'TN',
					},
					{
						name: 'Texas',
						value: 'TX',
					},
					{
						name: 'Utah',
						value: 'UT',
					},
					{
						name: 'Vermont',
						value: 'VT',
					},
					{
						name: 'Virginia',
						value: 'VA',
					},
					{
						name: 'Washington',
						value: 'WA',
					},
					{
						name: 'West Virginia',
						value: 'WV',
					},
					{
						name: 'Wisconsin',
						value: 'WI',
					},
					{
						name: 'Wyoming',
						value: 'WY',
					},
					{
						name: 'Armed Forces (AA)',
						value: 'AA',
					},
					{
						name: 'Armed Forces (AE)',
						value: 'AE',
					},
					{
						name: 'Armed Forces (AP)',
						value: 'AP',
					},
				],
			},
			{
				displayName: 'Employee Country',
				name: 'employee_country',
				type: 'string',
				default: 'United States',
				required: true,
				description: 'Country where the employee is located.',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
				options: [
					{
						name: 'US',
						value: 'US',
					},
				],
			},
			{
				displayName: 'Employee Zip Code',
				name: 'employee_zip',
				type: 'string',
				default: '',
				required: true,
				description: 'ZIP code of the employee.',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Employee Phone',
				name: 'employee_phone',
				type: 'string',
				default: '',
				required: true,
				description: 'Phone number of the employee.',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
			},
			// Company Information
			{
				displayName: 'Return Person Name',
				name: 'return_person_name',
				type: 'string',
				default: '',
				required: true,
				description: 'Name of the person handling the return at the company.',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Return Company Name',
				name: 'return_company_name',
				type: 'string',
				default: '',
				required: true,
				description: 'Name of the company handling the return.',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Return Address Line 1',
				name: 'return_address_line_1',
				type: 'string',
				default: '',
				description: 'Return Address Line 1.',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Return Address Line 2',
				name: 'return_address_line_2',
				type: 'string',
				default: '',
				description: 'Return Address Line 2.',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Return City',
				name: 'return_city',
				type: 'string',
				default: '',
				required: true,
				description: 'City for the return address.',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Return State',
				name: 'return_state',
				type: 'options',
				default: '',
				required: true,
				description: 'State for the return address.',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
				options: [
					{
						name: 'Alabama',
						value: 'AL',
					},
					{
						name: 'Alaska',
						value: 'AK',
					},
					{
						name: 'Arizona',
						value: 'AZ',
					},
					{
						name: 'Arkansas',
						value: 'AR',
					},
					{
						name: 'California',
						value: 'CA',
					},
					{
						name: 'Colorado',
						value: 'CO',
					},
					{
						name: 'Connecticut',
						value: 'CT',
					},
					{
						name: 'Delaware',
						value: 'DE',
					},
					{
						name: 'District Of Columbia',
						value: 'DC',
					},
					{
						name: 'Florida',
						value: 'FL',
					},
					{
						name: 'Georgia',
						value: 'GA',
					},
					{
						name: 'Hawaii',
						value: 'HI',
					},
					{
						name: 'Idaho',
						value: 'ID',
					},
					{
						name: 'Illinois',
						value: 'IL',
					},
					{
						name: 'Indiana',
						value: 'IN',
					},
					{
						name: 'Iowa',
						value: 'IA',
					},
					{
						name: 'Kansas',
						value: 'KS',
					},
					{
						name: 'Kentucky',
						value: 'KY',
					},
					{
						name: 'Louisiana',
						value: 'LA',
					},
					{
						name: 'Maine',
						value: 'ME',
					},
					{
						name: 'Maryland',
						value: 'MD',
					},
					{
						name: 'Massachusetts',
						value: 'MA',
					},
					{
						name: 'Michigan',
						value: 'MI',
					},
					{
						name: 'Minnesota',
						value: 'MN',
					},
					{
						name: 'Mississippi',
						value: 'MS',
					},
					{
						name: 'Missouri',
						value: 'MO',
					},
					{
						name: 'Montana',
						value: 'MT',
					},
					{
						name: 'Nebraska',
						value: 'NE',
					},
					{
						name: 'Nevada',
						value: 'NV',
					},
					{
						name: 'New Hampshire',
						value: 'NH',
					},
					{
						name: 'New Jersey',
						value: 'NJ',
					},
					{
						name: 'New Mexico',
						value: 'NM',
					},
					{
						name: 'New York',
						value: 'NY',
					},
					{
						name: 'North Carolina',
						value: 'NC',
					},
					{
						name: 'North Dakota',
						value: 'ND',
					},
					{
						name: 'Ohio',
						value: 'OH',
					},
					{
						name: 'Oklahoma',
						value: 'OK',
					},
					{
						name: 'Oregon',
						value: 'OR',
					},
					{
						name: 'Pennsylvania',
						value: 'PA',
					},
					{
						name: 'Rhode Island',
						value: 'RI',
					},
					{
						name: 'South Carolina',
						value: 'SC',
					},
					{
						name: 'South Dakota',
						value: 'SD',
					},
					{
						name: 'Tennessee',
						value: 'TN',
					},
					{
						name: 'Texas',
						value: 'TX',
					},
					{
						name: 'Utah',
						value: 'UT',
					},
					{
						name: 'Vermont',
						value: 'VT',
					},
					{
						name: 'Virginia',
						value: 'VA',
					},
					{
						name: 'Washington',
						value: 'WA',
					},
					{
						name: 'West Virginia',
						value: 'WV',
					},
					{
						name: 'Wisconsin',
						value: 'WI',
					},
					{
						name: 'Wyoming',
						value: 'WY',
					},
					{
						name: 'Armed Forces (AA)',
						value: 'AA',
					},
					{
						name: 'Armed Forces (AE)',
						value: 'AE',
					},
					{
						name: 'Armed Forces (AP)',
						value: 'AP',
					},
				],
			},
			{
				displayName: 'Return Country',
				name: 'return_country',
				type: 'options',
				default: 'United States',
				required: true,
				description: 'Country for the return address.',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
				options: [
					{
						name: 'US',
						value: 'US',
					},
				],
			},
			{
				displayName: 'Return Zip Code',
				name: 'return_zip',
				type: 'string',
				default: '',
				required: true,
				description: 'ZIP code for the return address.',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Return Company Email',
				name: 'return_email',
				type: 'string',
				default: '',
				required: true,
				description: 'Email of the return company.',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Return Phone',
				name: 'return_phone',
				type: 'string',
				default: '',
				required: true,
				description: 'Phone number of the return company.',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const credentials: ICredentialDataDecryptedObject | undefined = await this.getCredentials(
			'RemoteRetrievalApi',
		);

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;
			let url = '';
			let method: IHttpRequestMethods = 'POST';
			let requestData: IDataObject = {};

			switch (operation) {
				case 'create':
					url = `${credentials.baseUrl}create-order`;
					method = 'POST';
					requestData = {
						orders: [
							{
								type_of_equipment: this.getNodeParameter('type_of_equipment', i) as string,
								order_type: this.getNodeParameter('order_type', i) as string,
								employee_info: {
									email: this.getNodeParameter('employee_email', i) as string,
									name: this.getNodeParameter('employee_name', i) as string,
									address_line_1: this.getNodeParameter('employee_address_line_1', i) as string,
									address_line_2: this.getNodeParameter('employee_address_line_2', i) as string,
									address_city: this.getNodeParameter('employee_city', i) as string,
									address_state: this.getNodeParameter('employee_state', i) as string,
									address_country: this.getNodeParameter('employee_country', i) as string,
									address_zip: this.getNodeParameter('employee_zip', i) as string,
									phone: this.getNodeParameter('employee_phone', i) as string,
								},
								company_info: {
									return_person_name: this.getNodeParameter('return_person_name', i) as string,
									return_company_name: this.getNodeParameter('return_company_name', i) as string,
									return_address_line_1: this.getNodeParameter(
										'return_address_line_1',
										i,
									) as string,
									return_address_line_2: this.getNodeParameter(
										'return_address_line_2',
										i,
									) as string,
									return_address_city: this.getNodeParameter('return_city', i) as string,
									return_address_state: this.getNodeParameter('return_state', i) as string,
									return_address_country: this.getNodeParameter('return_country', i) as string,
									return_address_zip: this.getNodeParameter('return_zip', i) as string,
									email: this.getNodeParameter('return_email', i) as string,
									phone: this.getNodeParameter('return_phone', i) as string,
								},
							},
						],
					};
					break;
				case 'get_orders':
					url = `${credentials.baseUrl}orders`;
					method = 'GET';
					break;
				case 'get_pending_orders':
					url = `${credentials.baseUrl}pending-orders/`;
					method = 'GET';
					break;
				default:
					throw new Error(`The operation "${operation}" is not supported.`);
			}

			// Make the HTTP request using axios
			try {
				
				const response = await this.helpers.request({
					method,
					url,
					headers: {
						Authorization: `Bearer ${credentials.apiKey}`,
						'Content-Type': 'application/json',
					},
					body: method == 'POST' ? requestData : undefined,
					json: true,
				});

				// Store the response data to return
				returnData.push(response);
			} catch (error) {
				throw new Error(`API request failed: ${error.message}`);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
