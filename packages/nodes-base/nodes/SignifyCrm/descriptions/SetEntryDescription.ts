import type { INodeProperties } from 'n8n-workflow';

export const setEntryFields: INodeProperties[] = [

    {
		displayName: 'Module Name',
		name: 'moduleName',
		type: 'string',
		required: true,
        default: '',
		displayOptions: {
			show: {
				resource: ['setEntry'],
			},
		},
	},
    {
		displayName: 'Name Value List',
		name: 'nameValueList',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Name Value',
		},
		default: [],
		placeholder: 'Add Name Value List',
		displayOptions: {
			show: {
				resource: ['setEntry'],
			},
		},
        options: [
            {
              name: 'nameValuePair',
              displayName: 'Name → Value',
                values: [
                    {
                        displayName: 'Name',
                        name: 'name',
                        type: 'string',
                        default: '',
                        description: 'The field name to be set.',
                    },
                    {
                        displayName: 'Value',
                        name: 'value',
                        type: 'string',
                        default: '',
                        description: 'Comma-separated list of fields to set.',
                    },
                ],
            },
        ],
	},
    {
		displayName: 'Track View',
		name: 'trackView',
		type: 'string',
		default: '',
        description: 'Flag the record as a recently viewed item.',
		displayOptions: {
			show: {
				resource: ['setEntry'],
			},
		},
	},
];
