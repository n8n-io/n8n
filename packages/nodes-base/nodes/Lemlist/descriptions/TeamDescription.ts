import {
	INodeProperties,
} from 'n8n-workflow';

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
			},
		],
		displayOptions: {
			show: {
				resource: [
					'team',
				],
			},
		},
	},
];

export const teamFields: INodeProperties[] = [
	// ----------------------------------
	//        team: get
	// ----------------------------------

];
