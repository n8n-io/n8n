import {
	INodeProperties,
} from 'n8n-workflow';

export const rpsDeviceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['rpsDevice'],
			},
		},
		options: [
			{
				name: 'Check Device',
				value: 'checkDevice',
				description: 'Detecting whether or not the device is registered',
			},
			{
				name: 'Check Mac',
				value: 'checkMac',
				description: 'Detecting whether or not the device exists',
			},
		],
		default: 'checkDevice',
	},
];

export const rpsDeviceFields: INodeProperties[] = [

	/*-------------------------------------------------------------------------- */
	/*                                rpsDevice:checkDevice                      */
	/* ------------------------------------------------------------------------- */
	{
		displayName: 'Mac',
		name: 'mac',
		required: true,
		type: 'string',
		// type: 'options',
		// typeOptions: {
		// 	loadOptionsMethod: 'getDeviceMacs',
		// },
		displayOptions: {
			show: {
				resource: ['rpsDevice'],
				operation: ['checkDevice'],
			},
		},
		default: '',
		description: 'The MAC address',
	},

	/*-------------------------------------------------------------------------- */
	/*                                rpsDevice:checkMac                         */
	/* ------------------------------------------------------------------------- */
	{
		displayName: 'Mac',
		name: 'mac',
		required: true,
		type: 'string',
		// type: 'options',
		// typeOptions: {
		// 	loadOptionsMethod: 'getDeviceMacs',
		// },
		displayOptions: {
			show: {
				resource: ['rpsDevice'],
				operation: ['checkMac'],
			},
		},
		default: '',
		description: 'The MAC address',
	},

];