import { INodeProperties } from 'n8n-workflow';

export const caseOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'case',
				],
			},
		},
		options: [
			{
				name: 'Add Comment',
				value: 'addComment',
				description: 'Add a comment to a case',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a case',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a case',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all cases',
			},
			{
				name: 'Get Summary',
				value: 'getSummary',
				description: `Returns an overview of case's metadata.`,
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a case',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a case',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const caseFields = [

/* -------------------------------------------------------------------------- */
/*                                case:create                                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod:  'getCaseTypes',
		},
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'The type of case',
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
					'case',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Account Id',
				name: 'accountId',
				type: 'string',
				default: '',
				description: 'ID of the account associated with this case.',
			},
			{
				displayName: 'Contact Id',
				name: 'contactId',
				type: 'string',
				default: '',
				description: 'IID of the associated Contact.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'A text description of the case. Limit: 32 KB.',
			},
			{
				displayName: 'Is Escalated',
				name: 'isEscalated',
				type: 'boolean',
				default: false,
				description: 'Indicates whether the case has been escalated (true) or not.',
			},
			{
				displayName: 'Origin',
				name: 'origin',
				type: 'options',
				typeOptions: {
					loadOptionsMethod:  'getCaseOrigins',
				},
				default: '',
				description: 'The source of the case, such as Email, Phone, or Web. Label is Case Origin.',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'The owner of the case.',
			},
			{
				displayName: 'Parent Id',
				name: 'ParentId',
				type: 'string',
				default: '',
				description: 'The ID of the parent case in the hierarchy. The label is Parent Case.',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCasePriorities',
				},
				default: '',
				description: 'The importance or urgency of the case, such as High, Medium, or Low.',
			},
			{
				displayName: 'Reason',
				name: 'reason',
				type: 'options',
				typeOptions: {
					loadOptionsMethod:  'getCaseReasons',
				},
				default: '',
				description: 'The reason why the case was created, such as Instructions not clear, or User didn’t attend training.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				typeOptions: {
					loadOptionsMethod:  'getCaseStatuses',
				},
				default: '',
				description: 'The status of the case, such as “New,” “Closed,” or “Escalated.” This field directly controls the IsClosed flag',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'The subject of the case. Limit: 255 characters.',
			},
			{
				displayName: 'Supplied Company',
				name: 'suppliedCompany',
				type: 'string',
				default: '',
				description: `The company name that was entered when the case was created. This field can't be updated after the case has been created..`,
			},
			{
				displayName: 'Supplied Email',
				name: 'suppliedEmail',
				type: 'string',
				default: '',
				description: `The email address that was entered when the case was created. This field can't be updated after the case has been created.`,
			},
			{
				displayName: 'Supplied Name',
				name: 'suppliedName',
				type: 'string',
				default: '',
				description: `The name that was entered when the case was created. This field can't be updated after the case has been created`,
			},
			{
				displayName: 'Supplied Phone',
				name: 'suppliedPhone',
				type: 'string',
				default: '',
				description: `The phone number that was entered when the case was created. This field can't be updated after the case has been created.`,
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 case:update                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'Id of case that needs to be fetched',
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
					'case',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				typeOptions: {
					loadOptionsMethod:  'getCaseTypes',
				},
				default: '',
				description: 'The type of case',
			},
			{
				displayName: 'Origin',
				name: 'origin',
				type: 'options',
				typeOptions: {
					loadOptionsMethod:  'getCaseOrigins',
				},
				default: '',
				description: 'The source of the case, such as Email, Phone, or Web. Label is Case Origin.',
			},
			{
				displayName: 'Reason',
				name: 'reason',
				type: 'options',
				typeOptions: {
					loadOptionsMethod:  'getCaseReasons',
				},
				default: '',
				description: 'The reason why the case was created, such as Instructions not clear, or User didn’t attend training.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				typeOptions: {
					loadOptionsMethod:  'getCaseStatuses',
				},
				default: '',
				description: 'The status of the case, such as “New,” “Closed,” or “Escalated.” This field directly controls the IsClosed flag',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'The owner of the case.',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'The subject of the case. Limit: 255 characters.',
			},
			{
				displayName: 'Parent Id',
				name: 'ParentId',
				type: 'string',
				default: '',
				description: 'The ID of the parent case in the hierarchy. The label is Parent Case.',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCasePriorities',
				},
				default: '',
				description: 'The importance or urgency of the case, such as High, Medium, or Low.',
			},
			{
				displayName: 'Account Id',
				name: 'accountId',
				type: 'string',
				default: '',
				description: 'ID of the account associated with this case.',
			},
			{
				displayName: 'Contact Id',
				name: 'contactId',
				type: 'string',
				default: '',
				description: 'IID of the associated Contact.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'A text description of the case. Limit: 32 KB.',
			},
			{
				displayName: 'Is Escalated',
				name: 'isEscalated',
				type: 'boolean',
				default: false,
				description: 'Indicates whether the case has been escalated (true) or not.',
			},
			{
				displayName: 'Supplied Name',
				name: 'suppliedName',
				type: 'string',
				default: '',
				description: `The name that was entered when the case was created. This field can't be updated after the case has been created`,
			},
			{
				displayName: 'Supplied Email',
				name: 'suppliedEmail',
				type: 'string',
				default: '',
				description: `The email address that was entered when the case was created. This field can't be updated after the case has been created.`,
			},
			{
				displayName: 'Supplied Phone',
				name: 'suppliedPhone',
				type: 'string',
				default: '',
				description: `The phone number that was entered when the case was created. This field can't be updated after the case has been created.`,
			},
			{
				displayName: 'Supplied Company',
				name: 'suppliedCompany',
				type: 'string',
				default: '',
				description: `The company name that was entered when the case was created. This field can't be updated after the case has been created..`,
			},
		],
	},

/* -------------------------------------------------------------------------- */
/*                                  case:get                                  */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'Id of case that needs to be fetched',
	},
/* -------------------------------------------------------------------------- */
/*                                  case:delete                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'Id of case that needs to be fetched',
	},
/* -------------------------------------------------------------------------- */
/*                                 case:getAll                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'case',
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
					'case',
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
					'case',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Fields to include separated by ,',
			},
		],
	},

/* -------------------------------------------------------------------------- */
/*                               case:addComment                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'case',
				],
				operation: [
					'addComment',
				],
			},
		},
		description: 'Id of case that needs to be fetched',
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
					'case',
				],
				operation: [
					'addComment',
				],
			},
		},
		options: [
			{
				displayName: 'Comment Body',
				name: 'commentBody',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Text of the CaseComment. The maximum size of the comment body is 4,000 bytes. Label is Body.',
			},
			{
				displayName: 'Is Published',
				name: 'isPublished',
				type: 'boolean',
				default: false,
				description: 'Indicates whether the CaseComment is visible to customers in the Self-Service portal (true) or not (false). ',
			},
		],
	},
] as INodeProperties[];
