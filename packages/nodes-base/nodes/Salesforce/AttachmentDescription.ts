import {
	INodeProperties,
} from 'n8n-workflow';

export const attachmentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a attachment',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a attachment',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a attachment',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all attachments',
			},
			{
				name: 'Get Summary',
				value: 'getSummary',
				description: `Returns an overview of attachment's metadata.`,
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a attachment',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const attachmentFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                attachment:create                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Parent ID',
		name: 'parentId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
				operation: [
					'create',
				],
			},
		},
		description: '',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Required. Name of the attached file. Maximum size is 255 characters. Label is File Name.',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
				operation: [
					'create',
				],
			},
		},
		placeholder: '',
		description: 'Name of the binary property which contains the data for the file to be uploaded.',
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
					'attachment',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: `Text description of the Document. Limit: 255 characters.`,
			},
			{
				displayName: 'Is Private',
				name: 'isPrivate',
				type: 'boolean',
				default: false,
				description: 'Indicates whether this record is viewable only by the owner and administrators (true) or viewable by all otherwise-allowed users (false). ',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'ID of the User who owns the attachment.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 attachment:update           	              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Attachment ID',
		name: 'attachmentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'ID of attachment that needs to be fetched.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				placeholder: '',
				description: 'Name of the binary property which contains the data for the file to be uploaded.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: `Text description of the Document. Limit: 255 characters.`,
			},
			{
				displayName: 'Is Private',
				name: 'isPrivate',
				type: 'boolean',
				default: false,
				description: 'Indicates whether this record is viewable only by the owner and administrators (true) or viewable by all otherwise-allowed users (false). ',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Required. Name of the attached file. Maximum size is 255 characters. Label is File Name.',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'ID of the User who owns the attachment.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  attachment:get                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Attachment ID',
		name: 'attachmentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'ID of attachment that needs to be fetched.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                  attachment:delete                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Attachment ID',
		name: 'attachmentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'ID of attachment that needs to be fetched.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 attachment:getAll                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'attachment',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Conditions',
				name: 'conditionsUi',
				placeholder: 'Add Condition',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'The condition to set.',
				default: {},
				options: [
					{
						name: 'conditionValues',
						displayName: 'Condition',
						values: [
							{
								displayName: 'Field',
								name: 'field',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getAtachmentFields',
								},
								default: '',
								description: 'For date, number, or boolean, please use expressions.',
							},
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: [
									{
										name: '=',
										value: 'equal',
									},
									{
										name: '>',
										value: '>',
									},
									{
										name: '<',
										value: '<',
									},
									{
										name: '>=',
										value: '>=',
									},
									{
										name: '<=',
										value: '<=',
									},
								],
								default: 'equal',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Fields to include separated by ,',
			},
		],
	},
];
