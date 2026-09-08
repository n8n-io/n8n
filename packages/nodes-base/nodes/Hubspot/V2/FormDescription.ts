import type { INodeProperties } from 'n8n-workflow';

export const formOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['form'],
			},
		},
		options: [
			{
				name: 'Get fields',
				value: 'getFields',
				description: 'Get all fields from a form',
				action: 'Get all fields from a form',
			},
			{
				name: 'Submit',
				value: 'submit',
				description: 'Submit data to a form',
				action: 'Submit a form',
			},
		],
		default: 'getFields',
	},
];

export const formFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                form:submit                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Form name or ID',
		name: 'formId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getForms',
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['form'],
				operation: ['submit'],
			},
		},
		default: '',
		description:
			'The ID of the form you\'re sending data to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Options',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['form'],
				operation: ['submit'],
			},
		},
		options: [
			{
				displayName: 'Skip validation',
				name: 'skipValidation',
				type: 'boolean',
				default: false,
				description: 'Whether or not to skip validation based on the form settings',
			},
			{
				displayName: 'Submitted at',
				name: 'submittedAt',
				type: 'dateTime',
				default: '',
				description:
					'Time of the form submission. When using expressions, the time should be specified in YYYY-MM-DD hh-mm-ss format.',
			},
		],
	},
	{
		displayName: 'Context',
		name: 'contextUi',
		placeholder: 'Add context',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: false,
		},
		displayOptions: {
			show: {
				resource: ['form'],
				operation: ['submit'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Context',
				name: 'contextValue',
				values: [
					{
						displayName: 'HubSpot usertoken',
						name: 'hutk',
						type: 'string',
						default: '',
						description:
							'Include this parameter and set it to the hubspotutk cookie value to enable cookie tracking on your submission',
					},
					{
						displayName: 'IP address',
						name: 'ipAddress',
						type: 'string',
						default: '',
						description: 'The IP address of the visitor filling out the form',
					},
					{
						displayName: 'Page URI',
						name: 'pageUri',
						type: 'string',
						default: '',
						description: 'The URI of the page the submission happened on',
					},
					{
						displayName: 'Page name',
						name: 'pageName',
						type: 'string',
						default: '',
						description: 'The name or title of the page the submission happened on',
					},
					{
						displayName: 'Page ID',
						name: 'pageId',
						type: 'number',
						default: '',
						description: 'The ID of a page created on the HubSpot CMS',
					},
					{
						displayName: 'SFDC campaign ID',
						name: 'sfdcCampaignId',
						type: 'number',
						default: '',
						description:
							'If the form is for an account using the HubSpot Salesforce Integration, you can include the ID of a Salesforce campaign to add the contact to the specified campaign',
					},
					{
						displayName: 'Go to Webinar webinar ID',
						name: 'goToWebinarWebinarKey',
						type: 'number',
						default: '',
						description:
							'If the form is for an account using the HubSpot GoToWebinar Integration, you can include the ID of a webinar to enroll the contact in that webinar when they submit the form',
					},
				],
			},
		],
	},
	{
		displayName: 'Legal consent',
		name: 'lengalConsentUi',
		placeholder: 'Add legal consent',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: false,
		},
		displayOptions: {
			show: {
				resource: ['form'],
				operation: ['submit'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Consent',
				name: 'lengalConsentValues',
				values: [
					{
						displayName: 'Consent to process',
						name: 'consentToProcess',
						type: 'boolean',
						default: false,
						description: 'Whether or not the visitor checked the Consent to process checkbox',
					},
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						default: '',
						description: 'The text displayed to the visitor for the Consent to process checkbox',
					},
					{
						displayName: 'Communications',
						name: 'communicationsUi',
						placeholder: 'Add communication',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								displayName: 'Communication',
								name: 'communicationValues',
								values: [
									{
										displayName: 'Subcription type name or ID',
										name: 'subscriptionTypeId',
										type: 'options',
										typeOptions: {
											loadOptionsMethod: 'getSubscriptionTypes',
										},
										default: '',
										description:
											'The ID of the specific subscription type. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'boolean',
										default: false,
										description:
											'Whether or not the visitor checked the checkbox for this subscription type',
									},
									{
										displayName: 'Text',
										name: 'text',
										type: 'string',
										default: '',
										description:
											'The text displayed to the visitor for this specific subscription checkbox',
									},
								],
							},
						],
					},
				],
			},
			{
				displayName: 'Legitimate interest',
				name: 'legitimateInterestValues',
				values: [
					{
						displayName: 'Subcription type name or ID',
						name: 'subscriptionTypeId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getSubscriptionTypes',
						},
						default: '',
						description:
							'The ID of the specific subscription type that this forms indicates interest to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'boolean',
						default: false,
						// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
						description:
							"This must be true when using the 'legitimateInterest' option, as it reflects the consent indicated by the visitor when submitting the form",
					},
					{
						displayName: 'Legal basis',
						name: 'legalBasis',
						type: 'options',
						options: [
							{
								name: 'Customer',
								value: 'CUSTOMER',
							},
							{
								name: 'Lead',
								value: 'LEAD',
							},
						],
						default: '',
						description: 'The privacy text displayed to the visitor',
					},
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						default: '',
						description: 'The privacy text displayed to the visitor',
					},
				],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  form:getFields                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Form name or ID',
		name: 'formId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getForms',
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['form'],
				operation: ['getFields'],
			},
		},
		default: '',
		description:
			'The ID of the form. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
];
