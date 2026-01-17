import type { INodeProperties } from 'n8n-workflow';

export const teamOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get team information',
				action: 'Get a team',
			},
			{
				name: 'Get Credits',
				value: 'getCredits',
				description: 'Get team credits balance',
				action: 'Get team credits',
			},
			{
				name: 'Get Senders',
				value: 'getSenders',
				description: 'Get list of team senders and associated campaigns',
				action: 'Get team senders',
			},
		],
		displayOptions: {
			show: {
				resource: ['team'],
			},
		},
	},
];

export const teamFields: INodeProperties[] = [
	// ----------------------------------
	//        team: get
	// ----------------------------------
	// No additional fields required
	// ----------------------------------
	//        team: getCredits
	// ----------------------------------
	// No additional fields required
	// ----------------------------------
	//        team: getSenders
	// ----------------------------------
	// No additional fields required
];
