import {
	INodeProperties
} from 'n8n-workflow';

export const addressFixedCollection: INodeProperties = {
	displayName: 'Address',
	name: 'address',
	placeholder: 'Add Address Fields',
	type: 'fixedCollection',
	default: {},
	options: [
		{
			displayName: 'Address Fields',
			name: 'addressFields',
			values: [
				{
					displayName: 'Line 1',
					name: 'address',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Line 2',
					name: 'address2',
					type: 'string',
					default: '',
				},
				{
					displayName: 'City',
					name: 'city',
					type: 'string',
					default: '',
				},
				{
					displayName: 'State',
					name: 'state',
					type: 'string',
					default: '',
				},
				{
					displayName: 'ZIP',
					name: 'zip',
					type: 'string',
					default: '',
				},
			],
		},
	],
};
