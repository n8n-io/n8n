import type { INodeProperties } from 'n8n-workflow';

export const sequenceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getAll',
		options: [
			{
				name: 'Create Step',
				value: 'createStep',
				description: 'Create a new step in a sequence',
				action: 'Create a sequence step',
			},
			{
				name: 'Delete Step',
				value: 'deleteStep',
				description: 'Delete a step from a sequence',
				action: 'Delete a sequence step',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get sequences for a campaign',
				action: 'Get many sequences',
			},
			{
				name: 'Update Step',
				value: 'updateStep',
				description: 'Update a step in a sequence',
				action: 'Update a sequence step',
			},
		],
		displayOptions: {
			show: {
				resource: ['sequence'],
			},
		},
	},
];

export const sequenceFields: INodeProperties[] = [
	// ----------------------------------
	//        sequence: getAll
	// ----------------------------------
	{
		displayName: 'Campaign Name or ID',
		name: 'campaignId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		description:
			'ID of the campaign to get sequences for. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['sequence'],
				operation: ['getAll'],
			},
		},
	},

	// ----------------------------------
	//        sequence: createStep
	// ----------------------------------
	{
		displayName: 'Sequence ID',
		name: 'sequenceId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the sequence to add the step to',
		displayOptions: {
			show: {
				resource: ['sequence'],
				operation: ['createStep'],
			},
		},
	},
	{
		displayName: 'Step Type',
		name: 'stepType',
		type: 'options',
		required: true,
		default: 'email',
		options: [
			{
				name: 'API',
				value: 'api',
			},
			{
				name: 'Condition',
				value: 'condition',
			},
			{
				name: 'Email',
				value: 'email',
			},
			{
				name: 'LinkedIn Invite',
				value: 'linkedinInvite',
			},
			{
				name: 'LinkedIn Message',
				value: 'linkedinMessage',
			},
			{
				name: 'LinkedIn Visit',
				value: 'linkedinVisit',
			},
			{
				name: 'Manual',
				value: 'manual',
			},
		],
		description: 'Type of step to create',
		displayOptions: {
			show: {
				resource: ['sequence'],
				operation: ['createStep'],
			},
		},
	},
	{
		displayName: 'Delay Days',
		name: 'delayDays',
		type: 'number',
		required: true,
		default: 1,
		description: 'Number of days to wait before executing this step',
		displayOptions: {
			show: {
				resource: ['sequence'],
				operation: ['createStep'],
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
				resource: ['sequence'],
				operation: ['createStep'],
			},
		},
		options: [
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'Subject for email steps',
			},
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				default: '',
				description: 'Body content for email or message steps',
			},
			{
				displayName: 'Position',
				name: 'position',
				type: 'number',
				default: 0,
				description: 'Position of the step in the sequence',
			},
		],
	},

	// ----------------------------------
	//        sequence: updateStep
	// ----------------------------------
	{
		displayName: 'Sequence ID',
		name: 'sequenceId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the sequence containing the step',
		displayOptions: {
			show: {
				resource: ['sequence'],
				operation: ['updateStep'],
			},
		},
	},
	{
		displayName: 'Step ID',
		name: 'stepId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the step to update',
		displayOptions: {
			show: {
				resource: ['sequence'],
				operation: ['updateStep'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['sequence'],
				operation: ['updateStep'],
			},
		},
		options: [
			{
				displayName: 'Delay Days',
				name: 'delayDays',
				type: 'number',
				default: 1,
				description: 'Number of days to wait before executing this step',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'Subject for email steps',
			},
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				default: '',
				description: 'Body content for email or message steps',
			},
			{
				displayName: 'Position',
				name: 'position',
				type: 'number',
				default: 0,
				description: 'Position of the step in the sequence',
			},
		],
	},

	// ----------------------------------
	//        sequence: deleteStep
	// ----------------------------------
	{
		displayName: 'Sequence ID',
		name: 'sequenceId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the sequence containing the step',
		displayOptions: {
			show: {
				resource: ['sequence'],
				operation: ['deleteStep'],
			},
		},
	},
	{
		displayName: 'Step ID',
		name: 'stepId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the step to delete',
		displayOptions: {
			show: {
				resource: ['sequence'],
				operation: ['deleteStep'],
			},
		},
	},
];
