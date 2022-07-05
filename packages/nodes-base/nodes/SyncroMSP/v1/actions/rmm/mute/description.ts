import {
	RmmProperties,
} from '../../Interfaces';

export const rmmMuteDescription: RmmProperties = [
	{
		displayName: 'RMM Alert ID',
		name: 'alertId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'rmm',
				],
				operation: [
					'mute',
				],
			},
		},
		default: '',
		description: 'Mute the RMM alert by ID',
	},
	{
		displayName: 'Mute Period',
		name: 'muteFor',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'rmm',
				],
				operation: [
					'mute',
				],
			},
		},
		options: [
			{
				name: '1 hour',
				value: '1-hour',
			},
			{
				name: '1 day',
				value: '1-day',
			},
			{
				name: '2 days',
				value: '2-days',
			},
			{
				name: '1 week',
				value: '1-week',
			},
			{
				name: '2 weeks',
				value: '2-weeks',
			},
			{
				name: '1 month',
				value: '1-month',
			},
			{
				name: 'Forever',
				value: 'forever',
			},
		],
		default: '',
		description: 'Length of time to mute alert for',
	},
];
