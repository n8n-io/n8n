import {
	INodeProperties,
} from 'n8n-workflow';

export const submissionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a single submission',
				action: 'Delete a submission',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single submission',
				action: 'Get a submission',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all submissions',
				action: 'Get all submissions',
			},
			{
				name: 'Get Validation Status',
				value: 'getValidation',
				description: 'Get the validation status for the submission',
				action: 'Get the validation status for a submission',
			},
			{
				name: 'Update Validation Status',
				value: 'setValidation',
				description: 'Set the validation status of the submission',
				action: 'Update the validation status for a submission',
			},
		],
		default: 'getAll',
	},
];

export const submissionFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                submission:get                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Form Name or ID',
		name: 'formId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'loadForms',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'get',
					'delete',
					'getValidation',
					'setValidation',
				],
			},
		},
		description: 'Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Submission ID',
		name: 'submissionId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'get',
					'delete',
					'getValidation',
					'setValidation',
				],
			},
		},
		description: 'Submission ID (number, e.g. 245128)',
	},
	{
		displayName: 'Validation Status',
		name: 'validationStatus',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'setValidation',
				],
			},
		},
		default: '',
		options: [
			{
				name: 'Approved',
				value: 'validation_status_approved',
			},
			{
				name: 'Not Approved',
				value: 'validation_status_not_approved',
			},
			{
				name: 'On Hold',
				value: 'validation_status_on_hold',
			},
		],
		description: 'Desired Validation Status',
	},
	/* -------------------------------------------------------------------------- */
	/*                                submission:getAll                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Form Name or ID',
		name: 'formId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'loadForms',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			maxValue: 3000,
		},
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filter',
		name: 'filterType',
		type: 'options',
		default: 'none',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				name: 'None',
				value: 'none',
			},
			{
				name: 'JSON',
				value: 'json',
			},
		],
	},
	{
		displayName: 'See <a href="https://github.com/SEL-Columbia/formhub/wiki/Formhub-Access-Points-(API)#api-parameters" target="_blank">Formhub API docs</a> to creating filters, using the MongoDB JSON format - e.g. {"_submission_time":{"$lt":"2021-10-01T01:02:03"}}',
		name: 'jsonNotice',
		type: 'notice',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'getAll',
				],
				filterType: [
					'json',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Filters (JSON)',
		name: 'filterJson',
		type: 'string',
		default: '',
		typeOptions: {
			// alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'getAll',
				],
				filterType: [
					'json',
				],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
				operation: [
					'get',
					'getAll',
				],
			},
		},
		default: {},
		placeholder: 'Add Option',
		options: [
			{
				displayName: 'Download Attachments',
				name: 'download',
				type: 'boolean',
				default: false,
				description: 'Whether to download submitted attachments',
			},
			{
				displayName: 'Attachments Naming Scheme',
				name: 'binaryNamingScheme',
				type: 'options',
				default: 'sequence',
				displayOptions: {
					show: {
						download: [
							true,
						],
					},
				},
				options: [
					{
						name: 'Sequence (e.g. attachment_N)',
						value: 'sequence',
					},
					{
						name: 'Use Original Form Question ID',
						value: 'question',
					},
				],
			},
			{
				displayName: 'Attachments Prefix',
				name: 'dataPropertyAttachmentsPrefixName',
				type: 'string',
				displayOptions: {
					show: {
						download: [
							true,
						],
						binaryNamingScheme: [
							'sequence',
						],
					},
				},
				default: 'attachment_',
				description: 'Prefix for name of the binary property to which to write the attachments. An index starting with 0 will be added. So if name is "attachment_" the first attachment is saved to "attachment_0"',
			},
			{
				displayName: 'Fields to Retrieve',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Comma-separated list of fields to retrieve (e.g. _submission_time,_submitted_by). If left blank, all fields are retrieved.',
			},
			{
				displayName: 'File Size',
				name: 'version',
				type: 'options',
				displayOptions: {
					show: {
						download: [
							true,
						],
					},
				},
				default: 'download_url',
				description: 'Attachment size to retrieve, if multiple versions are available',
				options: [
					{
						name: 'Original',
						value: 'download_url',
					},
					{
						name: 'Small',
						value: 'download_small_url',
					},
					{
						name: 'Medium',
						value: 'download_medium_url',
					},
					{
						name: 'Large',
						value: 'download_large_url',
					},
				],
			},
			{
				displayName: 'Multiselect Mask',
				name: 'selectMask',
				type: 'string',
				default: 'select_*',
				description: 'Comma-separated list of wildcard-style selectors for fields that should be treated as multiselect fields, i.e. parsed as arrays.',
			},
			{
				displayName: 'Number Mask',
				name: 'numberMask',
				type: 'string',
				default: 'n_*, f_*',
				description: 'Comma-separated list of wildcard-style selectors for fields that should be treated as numbers',
			},
			{
				displayName: 'Reformat',
				name: 'reformat',
				type: 'boolean',
				default: false,
				description: 'Whether to apply some reformatting to the submission data, such as parsing GeoJSON coordinates',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'json',
				default: '',
				description: 'Sort predicates, in MongoDB JSON format (e.g. {"_submission_time":1})',
			},
		],
	},
];
