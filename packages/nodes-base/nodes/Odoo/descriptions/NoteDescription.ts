import { INodeProperties } from 'n8n-workflow';

const noteFields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Text',
		name: 'memo',
		type: 'string',
		default: '',
	},
];

export const noteDescription: INodeProperties[] = [
	// Additional fields =============================================================
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['note'],
			},
		},
		options: [...noteFields],
	},
	// Update fields =============================================================
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['note'],
			},
		},
		options: [...noteFields],
	},
];
