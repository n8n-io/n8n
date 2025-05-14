import type { INodeProperties } from 'n8n-workflow';

import {
	makeGetAllFields,
} from './SharedFields';

export const leadOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['lead'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a lead',
				action: 'Create a lead',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a lead',
				action: 'Delete a lead',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a lead',
				action: 'Get a lead',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many leads',
				action: 'Get many leads',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a lead',
				action: 'Update a lead',
			},
		],
		default: 'create',
	},
];

export const leadFields: INodeProperties[] = [
	// ----------------------------------------
	//             lead: create
	// ----------------------------------------
    {
		displayName: 'Salutation',
		name: 'salutation',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['create'],
			},
		},
        options: [
            {
                name: '',
                value: '',
            },
            {
                name: "K.",
                value: "K.",
            },
            {
                name: "Mr.",
                value: "Mr.",
            },
            {
                name: "Ms.",
                value: "Ms.",
            },
            {
                name: "Mrs.",
                value: "Mrs.",
            },
            {
                name: "Dr.",
                value: "Dr.",
            },
            {
                name: "Prof.",
                value: "Prof.",
            },
            {
                name: "Asst.",
                value: "Asst.",
            },
            {
                name: "คุณ",
                value: "คุณ",
            },
            {
                name: "นาย",
                value: "นาย",
            },
            {
                name: "นางสาว",
                value: "นางสาว",
            },
            {
                name: "นาง",
                value: "นาง",
            },
            {
                name: "ดร.",
                value: "ดร.",
            },
            {
                name: "ศจ.",
                value: "ศจ.",
            },
            {
                name: "รศ.",
                value: "รศ.",
            }
        ]
	},
	{
		displayName: 'First Name',
		name: 'first_name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['create'],
			},
		},
	},
    {
		displayName: 'Status',
		name: 'status',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['create'],
			},
		},
        options: [
            {
                name: "",
                value: ""
            },
            {
                name: "New",
                value: "New"
            },
            {
                name: "Assigned",
                value: "Assigned"
            },
            {
                name: "In Process",
                value: "In Process"
            },
            {
                name: "Converted",
                value: "Converted"
            },
            {
                name: "Registered",
                value: "Registered"
            },
            {
                name: "Recycled",
                value: "Recycled"
            },
            {
                name: "Dead",
                value: "Dead"
            }
        ]
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['create'],
			},
		},
		options: [
            {
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
			},
            {
				displayName: 'Account Name',
				name: 'account_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email (Primary)',
				name: 'email1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
            {
				displayName: 'Office Phone',
				name: 'phone_work',
				type: 'string',
				default: '',
			},
            {
				displayName: 'Mobile',
				name: 'phone_mobile',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Department',
				name: 'department',
				type: 'string',
				default: '',
			},
            {
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
            {
				displayName: 'Lead Source',
				name: 'lead_source',
				type: 'options',
                options: [
                    {
                        name: "",
                        value: ""
                    },
                    {
                        name: "Self Generated",
                        value: "Self Generated"
                    },
                    {
                        name: "Employee",
                        value: "Employee"
                    },
                    {
                        name: "Partner",
                        value: "Partner"
                    },
                    {
                        name: "Existing Customer",
                        value: "Existing Customer"
                    },
                    {
                        name: "Word of mouth",
                        value: "Word of mouth"
                    },
                    {
                        name: "Trade Show",
                        value: "Trade Show"
                    },
                    {
                        name: "Conference",
                        value: "Conference"
                    },
                    {
                        name: "Campaign",
                        value: "Campaign"
                    },
                    {
                        name: "Cold Call",
                        value: "Cold Call"
                    },
                    {
                        name: "Email",
                        value: "Email"
                    },
                    {
                        name: "Web Site",
                        value: "Web Site"
                    },
                    {
                        name: "Social",
                        value: "Social Media"
                    },
                    {
                        name: "Other",
                        value: "Other"
                    }
                ],
				default: [],
			},
            {
				displayName: 'Assigned To',
				name: 'assigned_user_id',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUserList',
				},
				default: [],
			},
            {
				displayName: 'Campaign',
				name: 'campaign_id',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCampaignList',
				},
				default: [],
			},
		],
	},

	// ----------------------------------------
	//             lead: delete
	// ----------------------------------------
	{
		displayName: 'Lead ID',
		name: 'leadId',
		description: 'ID of the lead to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//               lead: get
	// ----------------------------------------
	{
		displayName: 'Lead ID',
		name: 'leadId',
		description: 'ID of the lead to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//             lead: getAll
	// ----------------------------------------
	...makeGetAllFields('lead'),

	// ----------------------------------------
	//             lead: update
	// ----------------------------------------
	{
		displayName: 'Lead ID',
		name: 'leadId',
		description: 'ID of the lead to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['update'],
			},
		},
	},
    {
		displayName: 'Salutation',
		name: 'salutation',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['update'],
			},
		},
        options: [
            {
                name: '',
                value: '',
            },
            {
                name: "K.",
                value: "K.",
            },
            {
                name: "Mr.",
                value: "Mr.",
            },
            {
                name: "Ms.",
                value: "Ms.",
            },
            {
                name: "Mrs.",
                value: "Mrs.",
            },
            {
                name: "Dr.",
                value: "Dr.",
            },
            {
                name: "Prof.",
                value: "Prof.",
            },
            {
                name: "Asst.",
                value: "Asst.",
            },
            {
                name: "คุณ",
                value: "คุณ",
            },
            {
                name: "นาย",
                value: "นาย",
            },
            {
                name: "นางสาว",
                value: "นางสาว",
            },
            {
                name: "นาง",
                value: "นาง",
            },
            {
                name: "ดร.",
                value: "ดร.",
            },
            {
                name: "ศจ.",
                value: "ศจ.",
            },
            {
                name: "รศ.",
                value: "รศ.",
            }
        ]
	},
	{
		displayName: 'First Name',
		name: 'first_name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['update'],
			},
		},
	},
    {
		displayName: 'Status',
		name: 'status',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['update'],
			},
		},
        options: [
            {
                name: "",
                value: ""
            },
            {
                name: "New",
                value: "New"
            },
            {
                name: "Assigned",
                value: "Assigned"
            },
            {
                name: "In Process",
                value: "In Process"
            },
            {
                name: "Converted",
                value: "Converted"
            },
            {
                name: "Registered",
                value: "Registered"
            },
            {
                name: "Recycled",
                value: "Recycled"
            },
            {
                name: "Dead",
                value: "Dead"
            }
        ]
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['update'],
			},
		},
		options: [
            {
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
			},
            {
				displayName: 'Account Name',
				name: 'account_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email (Primary)',
				name: 'email1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
            {
				displayName: 'Office Phone',
				name: 'phone_work',
				type: 'string',
				default: '',
			},
            {
				displayName: 'Mobile',
				name: 'phone_mobile',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Department',
				name: 'department',
				type: 'string',
				default: '',
			},
            {
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
            {
				displayName: 'Lead Source',
				name: 'lead_source',
				type: 'options',
                options: [
                    {
                        name: "",
                        value: ""
                    },
                    {
                        name: "Self Generated",
                        value: "Self Generated"
                    },
                    {
                        name: "Employee",
                        value: "Employee"
                    },
                    {
                        name: "Partner",
                        value: "Partner"
                    },
                    {
                        name: "Existing Customer",
                        value: "Existing Customer"
                    },
                    {
                        name: "Word of mouth",
                        value: "Word of mouth"
                    },
                    {
                        name: "Trade Show",
                        value: "Trade Show"
                    },
                    {
                        name: "Conference",
                        value: "Conference"
                    },
                    {
                        name: "Campaign",
                        value: "Campaign"
                    },
                    {
                        name: "Cold Call",
                        value: "Cold Call"
                    },
                    {
                        name: "Email",
                        value: "Email"
                    },
                    {
                        name: "Web Site",
                        value: "Web Site"
                    },
                    {
                        name: "Social",
                        value: "Social Media"
                    },
                    {
                        name: "Other",
                        value: "Other"
                    }
                ],
				default: [],
			},
            {
				displayName: 'Assigned To',
				name: 'assigned_user_id',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUserList',
				},
				default: [],
			},
            {
				displayName: 'Campaign',
				name: 'campaign_id',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCampaignList',
				},
				default: [],
			},
		],
	},

];
