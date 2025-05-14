import type { INodeProperties } from 'n8n-workflow';

export const getEntryFields: INodeProperties[] = [

    {
		displayName: 'Module Name',
		name: 'moduleName',
		type: 'string',
		required: true,
        default: '',
		displayOptions: {
			show: {
				resource: ['getEntry'],
			},
		},
	},
	{
		displayName: 'Record ID',
		name: 'recordId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['getEntry'],
			},
		},
	},
    {
		displayName: 'Select Fields',
		name: 'selectFields',
		type: 'string',
		default: '',
        description: 'Comma-separated list of fields to be returned in the results. Specifying an empty value will return all fields.',
		displayOptions: {
			show: {
				resource: ['getEntry'],
			},
		},
	},
    {
		displayName: 'Link Name to Fields',
		name: 'linkNameToFields',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Link Name',
		},
		default: [],
		placeholder: 'Add Link Name to Fields',
		displayOptions: {
			show: {
				resource: ['getEntry'],
			},
		},
        options: [
            {
              name: 'linkPair',
              displayName: 'Link → Fields',
                values: [
                    {
                        displayName: 'Name',
                        name: 'link_name',
                        type: 'string',
                        default: '',
                        description: 'The relationship name to pull (e.g. email_addresses)',
                    },
                    {
                        displayName: 'Value',
                        name: 'link_value',
                        type: 'string',
                        default: '',
                        description: 'Comma-separated list of fields to return',
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
				resource: ['getEntry'],
			},
		},
	},
];
