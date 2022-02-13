import {
	INodeProperties,
} from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
			},
		},
		options: [
			{
				name: 'Get Next Customer Number',
				value: 'getNextCustomerNumber',
				description: 'Retrieves the next available customer number. Avoids duplicates.',
			},
			{
				name: 'Contact Customer Number Availability Check',
				value: 'contactCustomerNumberAvailabilityCheck',
				description: 'Checks if a given customer number is available or already used',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Returns a single contact',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'There are a multitude of parameter which can be used to filter.<br> A few of them are attached but for a complete list please check out <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-contacts#filtering">this</a> list',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'There are a multitude of parameter which can be used to filter.<br> A few of them are attached but for a complete list please check out <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-contacts#filtering">this</a> list',
			},
		],
		default: 'get',
		// nodelinter-ignore-next-line WEAK_PARAM_DESCRIPTION
		description: 'The operation to perform',
	},
];

export const contactFields: INodeProperties[] = [
	// ----------------------------------------
	//               contact: getNextCustomerNumber
	// ----------------------------------------

	// ----------------------------------------
	//               contact: contactCustomerNumberAvailabilityCheck
	// ----------------------------------------
	{
		displayName: 'Customer Number',
		name: 'customerNumber',
		description: 'The customer number to be checked',
		type: 'string',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'contactCustomerNumberAvailabilityCheck',
				],
			},
		},
	},

	// ----------------------------------------
	//               contact: getAll
	// ----------------------------------------

	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Depth',
				name: 'depth',
				description: 'Defines if both organizations and persons should be returned. "0" -> only organizations, "1" -> organizations and persons.',
				type: 'number',
				default: '',
			},
			{
				displayName: 'Customer Number',
				name: 'customerNumber',
				description: 'Retrieve all contacts with this customer number',
				type: 'string',
				default: '',
			},
		],
	},

	// ----------------------------------------
	//               contact: create
	// ----------------------------------------
	{
		displayName: 'Category',
		name: 'category',
		description: 'Category of the contact. For more information, see <a href="https://my.sevdesk.de/apiOverview/index.html#/doc-contacts#types">here</a>.',
		type: 'collection',
		required: true,
		default: {},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'ID',
				name: 'id',
				description: 'Unique identifier of the category',
				type: 'string',
				default: 0,
			},
			{
				displayName: 'Object Name',
				name: 'objectName',
				description: 'Model name, which is "Category"',
				type: 'string',
				default: 'Category',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				description: 'The organization name. Be aware that the type of contact will depend on this attribute. If it holds a value, the contact will be regarded as an organization.',
				type: 'string',
				default: 0,
			},
			{
				displayName: 'Customer Number',
				name: 'customerNumber',
				description: 'The customer number',
				type: 'string',
				default: 0,
			},
			{
				displayName: 'Parent',
				name: 'parent',
				description: 'The parent contact to which this contact belongs. Must be an organization.',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the parent contact',
						type: 'string',
						default: 0,
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						description: 'Model name, which is "Contact"',
						type: 'string',
						default: 'Contact',
					},
				],
			},
			{
				displayName: 'First Name',
				name: 'surename',
				description: 'The first name of the contact. Not to be used for organizations.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Second Name',
				name: 'name2',
				description: 'The second name of the contact. Not to be used for organizations.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Last Name',
				name: 'familyname',
				description: 'The last name of the contact. Not to be used for organizations.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Title',
				name: 'titel',
				description: 'A non-academic title for the contact. Not to be used for organizations.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				description: 'A description for the contact',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Academic Title',
				name: 'academicTitle',
				description: 'A academic title for the contact. Not to be used for organizations.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Gender',
				name: 'gender',
				description: 'Gender of the contact. Not to be used for organizations.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Birthday',
				name: 'birthday',
				description: 'Birthday of the contact. Not to be used for organizations.',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Vat Number',
				name: 'vatNumber',
				description: 'Vat Number of the contact',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Bank Account',
				name: 'bankAccount',
				description: 'Bank account number (IBAN) of the contact',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Bank Number',
				name: 'bankNumber',
				description: 'Bank number of the contact',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Default Cashback Time',
				name: 'defaultCashbackTime',
				description: 'Absolute time in days which the contact has to pay his invoices and subsequently get a cashback',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Default Cashback Percent',
				name: 'defaultCashbackPercent',
				description: 'Percentage of the invoice sum the contact gets back if he payed invoices in time',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Default Time To Pay',
				name: 'defaultTimeToPay',
				description: 'The payment goal in days which is set for every invoice of the contact',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Tax Number',
				name: 'taxNumber',
				description: 'The tax number of the contact',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax Office',
				name: 'taxOffice',
				description: 'The tax office responsible for the contact',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Exempt Vat',
				name: 'exemptVat',
				description: 'Defines if the contact is freed from paying vat',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Tax Type',
				name: 'taxType',
				description: 'Defines which tax regulation the contact is using. One of "default", "eu", "noteu", "custom"',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax Set',
				name: 'taxSet',
				description: 'Tax set which is used in every invoice of the contact',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the parent contact',
						type: 'string',
						default: 0,
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						description: 'Model name, which is "TaxSet"',
						type: 'string',
						default: 'TaxSet',
					},
				],
			},
			{
				displayName: 'Default Discount Amount',
				name: 'defaultDiscountAmount',
				description: 'The default discount the contact gets for every invoice. Depending on defaultDiscountPercentage attribute, in percent or absolute value.',
				type: 'number',
				default: '',
			},
			{
				displayName: 'Default Discount Percentage',
				name: 'defaultDiscountPercentage',
				description: 'Defines if the discount is a percentage (true) or an absolute value (false).',
				type: 'boolean',
				default: false,
			},
		],
	},
	// ----------------------------------------
	//               contact: get
	// ----------------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of contact to return',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'get',
				],
			},
		},
	},
	// ----------------------------------------
	//               contact: update
	// ----------------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of contact to return',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				description: 'The organization name. Be aware that the type of contact will depend on this attribute. If it holds a value, the contact will be regarded as an organization.',
				type: 'string',
				required: true,
				default: 0,
				displayOptions: {
					show: {
						resource: [
							'contact',
						],
						operation: [
							'update',
						],
					},
				},
			},
			{
				displayName: 'Category',
				name: 'category',
				description: 'Category of the contact. For more information, see <a href="https://my.sevdesk.de/apiOverview/index.html#/doc-contacts#types">here</a>.',
				type: 'collection',
				required: true,
				default: {},
				displayOptions: {
					show: {
						resource: [
							'contact',
						],
						operation: [
							'update',
						],
					},
				},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the category',
						type: 'string',
						default: 0,
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						description: 'Model name, which is "Category"',
						type: 'string',
						default: 'Category',
					},
				],
			},
			{
				displayName: 'Name',
				name: 'name',
				description: 'The organization name. Be aware that the type of contact will depend on this attribute. If it holds a value, the contact will be regarded as an organization.',
				type: 'string',
				default: 0,
			},
			{
				displayName: 'Customer Number',
				name: 'customerNumber',
				description: 'The customer number',
				type: 'string',
				default: 0,
			},
			{
				displayName: 'Parent',
				name: 'parent',
				description: 'The parent contact to which this contact belongs. Must be an organization.',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the parent contact',
						type: 'string',
						default: 0,
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						description: 'Model name, which is "Contact"',
						type: 'string',
						default: 'Contact',
					},
				],
			},
			{
				displayName: 'First Name',
				name: 'surename',
				description: 'The first name of the contact. Not to be used for organizations.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Second Name',
				name: 'name2',
				description: 'The second name of the contact. Not to be used for organizations.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Last Name',
				name: 'familyname',
				description: 'The last name of the contact. Not to be used for organizations.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Title',
				name: 'titel',
				description: 'A non-academic title for the contact. Not to be used for organizations.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				description: 'A description for the contact',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Academic Title',
				name: 'academicTitle',
				description: 'A academic title for the contact. Not to be used for organizations.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Gender',
				name: 'gender',
				description: 'Gender of the contact. Not to be used for organizations.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Birthday',
				name: 'birthday',
				description: 'Birthday of the contact. Not to be used for organizations.',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Vat Number',
				name: 'vatNumber',
				description: 'Vat Number of the contact',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Bank Account',
				name: 'bankAccount',
				description: 'Bank account number (IBAN) of the contact',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Bank Number',
				name: 'bankNumber',
				description: 'Bank number of the contact',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Default Cashback Time',
				name: 'defaultCashbackTime',
				description: 'Absolute time in days which the contact has to pay his invoices and subsequently get a cashback',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Default Cashback Percent',
				name: 'defaultCashbackPercent',
				description: 'Percentage of the invoice sum the contact gets back if he payed invoices in time',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Default Time To Pay',
				name: 'defaultTimeToPay',
				description: 'The payment goal in days which is set for every invoice of the contact',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Tax Number',
				name: 'taxNumber',
				description: 'The tax number of the contact',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax Office',
				name: 'taxOffice',
				description: 'The tax office responsible for the contact',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Exempt Vat',
				name: 'exemptVat',
				description: 'Defines if the contact is freed from paying vat',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Tax Type',
				name: 'taxType',
				description: 'Defines which tax regulation the contact is using. One of "default", "eu", "noteu", "custom"',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax Set',
				name: 'taxSet',
				description: 'Tax set which is used in every invoice of the contact',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the parent contact',
						type: 'string',
						default: 0,
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						description: 'Model name, which is "TaxSet"',
						type: 'string',
						default: 'TaxSet',
					},
				],
			},
			{
				displayName: 'Default Discount Amount',
				name: 'defaultDiscountAmount',
				description: 'The default discount the contact gets for every invoice. Depending on defaultDiscountPercentage attribute, in percent or absolute value.',
				type: 'number',
				default: '',
			},
			{
				displayName: 'Default Discount Percentage',
				name: 'defaultDiscountPercentage',
				description: 'Defines if the discount is a percentage (true) or an absolute value (false).',
				type: 'boolean',
				default: false,
			},
		],
	},
];
