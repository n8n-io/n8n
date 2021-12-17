import {
	INodeProperties,
} from 'n8n-workflow';

export const transactionalEMailActions = [
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		displayOptions: {
			show: {
				apiResource: ['transactionalEMails'],
			},
		},
		options: [
			{
				name: 'Send',
				value: 'send',
				description: 'Send a transactional email',
			},
		],
		default: 'send',
	},
	{
		displayName: 'Receivers',
		name: 'receivers',
		placeholder: 'Add Receiver',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		description: 'Mandatory if messageVersions are not passed, ignored if messageVersions are passed\n' +
			'List of email addresses and names (optional) of the recipients. For example,\n' +
			'[{"name":"Jimmy", "email":"jimmy98@example.com"}, {"name":"Joe", "email":"joe@example.com"}]',
		default: {},
		required: true,
		options: [
			{
				name: 'to',
				displayName: 'To',
				values: [
					{
						displayName: 'eMail Address',
						name: 'email',
						type: 'string',
						required: true,
						default: '',
						description: 'The eMail address of the receiver',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						required: false,
						default: '',
						description: 'The name of the receiver',
					},
				],
			},
			{
				name: 'cc',
				displayName: 'CC',
				values: [
					{
						displayName: 'eMail Address',
						name: 'email',
						type: 'string',
						required: true,
						default: '',
						description: 'The eMail address of the receiver',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						required: false,
						default: '',
						description: 'The name of the receiver',
					},
				],
			},
			{
				name: 'bcc',
				displayName: 'BCC',
				values: [
					{
						displayName: 'eMail Address',
						name: 'email',
						type: 'string',
						required: true,
						default: '',
						description: 'The eMail address of the receiver',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						required: false,
						default: '',
						description: 'The name of the receiver',
					},
				],
			},
		],
		displayOptions: {
			show: {
				'/action': ['send'],
			},
		},
	},
] as INodeProperties[];

export const transactionalEMailFields = [
] as INodeProperties[];


export const transactionalEMailOptions = [
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				apiResource: ['transactionalEMails'],
			},
		},
		options: [
			{
				displayName: 'Attachments Binary',
				name: 'attachments',
				type: 'string',
				default: '',
				description: 'Name of the binary properties which contain data which should be added to email as attachment. Multiple ones can be comma separated.',
			},
			{
				displayName: 'Attachments Property Name',
				name: 'attachments_list',
				type: 'string',
				default: '',
				description: 'Name of the property which contains an array with attachment data (e.g. [{"url":"https://...", "name":"file.pdf"}])',
			},
			{
				displayName: 'Template ID',
				name: 'templateId',
				type: 'number',
				description: 'Id of the template. Mandatory if messageVersions are passed',
				displayOptions: {
					show: {
						'/action': ['send'],
					},
				},
				default: 0,
			},
			{
				displayName: 'Params',
				name: 'params',
				placeholder: 'Add Parameter',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'Pass the set of attributes to customize the template. For example, {"FNAME":"Joe", "LNAME":"Doe"}. It\'s considered only if template is in New Template Language format.',
				default: {},
				required: false,
				options: [
					{
						name: 'param',
						displayName: 'Param',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								required: true,
								default: '',
								description: 'The name of the parameter (e.g. FNAME)',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								required: true,
								default: '',
								description: 'The value of the paramter (e.g. John)',
							},
						],
					},
				],
				displayOptions: {
					show: {
						'/action': ['send'],
					},
				},
			},
			{
				displayName: 'Params Property Name',
				name: 'params_property_name',
				type: 'string',
				description: 'Pass the set of attributes to customize the template. For example, {"FNAME":"Joe", "LNAME":"Doe"}. It\'s considered only if template is in New Template Language format.',
				displayOptions: {
					show: {
						'/action': ['send'],
					},
				},
				default: 'params',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				description: 'Tag your emails to find them more easily (array of strings or csv string)',
				displayOptions: {
					show: {
						'/action': ['send'],
					},
				},
				default: 'tags',
			},
			{
				displayName: 'Headers',
				name: 'headers',
				placeholder: 'Add Header',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'Pass the set of custom headers (not the standard headers) that shall be sent along the mail headers in the original email. \'sender.ip\' header can be set (only for dedicated ip users) to mention the IP to be used for sending transactional emails. Headers are allowed in This-Case-Only (i.e. words separated by hyphen with first letter of each word in capital letter), they will be converted to such case styling if not in this format in the request payload. For example,\n' +
					'{"sender.ip":"1.2.3.4", "X-Mailin-custom":"some_custom_header"}.',
				default: {},
				required: false,
				options: [
					{
						name: 'header',
						displayName: 'Header',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								required: true,
								default: '',
								description: 'The name of the parameter (e.g. "sender.ip")',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								required: true,
								default: '',
								description: 'The value of the paramter (e.g. "1.2.3.4")',
							},
						],
					},
				],
				displayOptions: {
					show: {
						'/action': ['send'],
					},
				},
			},
		],
	},
] as INodeProperties[];
