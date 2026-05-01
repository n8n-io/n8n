import type { INodeProperties } from 'n8n-workflow';

export const lookupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['lookup'],
			},
		},
		options: [
			{
				name: 'CNAM',
				value: 'cnam',
				description: 'Calling Name lookup',
				action: 'Perform a CNAM lookup',
			},
			{
				name: 'Format',
				value: 'format',
				description: 'National and international format plus operator details',
				action: 'Format a number',
			},
			{
				name: 'HLR',
				value: 'hlr',
				description: 'Home Location Register lookup (validity, roaming, carrier)',
				action: 'Perform an HLR lookup',
			},
			{
				name: 'MNP',
				value: 'mnp',
				description: 'Mobile Number Porting lookup',
				action: 'Perform an MNP lookup',
			},
			{
				name: 'RCS',
				value: 'rcs',
				description: 'Check whether a number supports RCS messaging',
				action: 'Perform an RCS capability lookup',
			},
		],
		default: 'format',
	},
];

export const lookupFields: INodeProperties[] = [
	{
		displayName: 'Number',
		name: 'number',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['lookup'],
			},
		},
		description:
			'Phone number to query. For format lookup multiple numbers can be separated by commas.',
	},
	{
		displayName: 'From (Agent ID)',
		name: 'from',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['lookup'],
				operation: ['rcs'],
			},
		},
		description: 'Agent identifier for RCS capability checking. Defaults to first RCS sender ID.',
	},
];
