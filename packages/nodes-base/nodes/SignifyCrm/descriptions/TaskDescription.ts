import type { INodeProperties } from 'n8n-workflow';

import {
	makeGetAllFields,
} from './SharedFields';

export const taskOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['task'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a task',
				action: 'Create a task',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a task',
				action: 'Delete a task',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a task',
				action: 'Get a task',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many tasks',
				action: 'Get many tasks',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a task',
				action: 'Update a task',
			},
		],
		default: 'create',
	},
];

export const taskFields: INodeProperties[] = [
	// ----------------------------------------
	//             task: create
	// ----------------------------------------
    {
		displayName: 'Subject',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['create'],
			},
		},
	},
    {
		displayName: 'Status',
		name: 'status',
		type: 'options',
		default: 'Not Started',
        required: true,
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['create'],
			},
		},
        options: [
            {
                name: "Not Started",
                value: "Not Started"
            },
            {
                name: "In Progress",
                value: "In Progress"
            },
            {
                name: "Completed",
                value: "Completed"
            },
            {
                name: "Pending Input",
                value: "Pending Input"
            },
            {
                name: "Deferred",
                value: "Deferred"
            }
        ]
	},
    {
        displayName: 'Priority',
        name: 'priority',
        type: 'options',
        default: '',
        required: true,
        displayOptions: {
			show: {
				resource: ['task'],
				operation: ['create'],
			},
		},
        options: [
            {
                name: "",
                value: ""
            },
            {
                name: "High",
                value: "High"
            },
            {
                name: "Medium",
                value: "Medium"
            },
            {
                name: "Low",
                value: "Low"
            },
        ]
    },
    {
        displayName: 'Start Date',
        name: 'date_start',
        type: 'dateTime',
        default: '',
        displayOptions: {
			show: {
				resource: ['task'],
				operation: ['create'],
			},
		},
    },
    {
        displayName: 'Due Date',
        name: 'date_due',
        type: 'dateTime',
        default: '',
        displayOptions: {
			show: {
				resource: ['task'],
				operation: ['create'],
			},
		},
    },
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['create'],
			},
		},
		options: [
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
                displayName: 'Related To',
                name: 'relatedToFields',
                type: 'fixedCollection',
                typeOptions: {
                    multipleValues: false,
                    multipleValueButtonText: 'Add Related To',
                },
                default: [],
                placeholder: 'Add Related To to Field',
                options: [
                    {
                      name: 'relatedToPair',
                      displayName: 'Related To → Field',
                        values: [
                            {
                                displayName: 'Module Name',
                                name: 'parent_type',
                                type: 'options',
                                default: 'Accounts',
                                options: [
                                    {
                                        name: "Account",
                                        value: "Accounts"
                                    },
                                    {
                                        name: "Ticket",
                                        value: "Tickets"
                                    },
                                    {
                                        name: "Case",
                                        value: "Cases"
                                    },
                                    {
                                        name: "Contact",
                                        value: "Contacts"
                                    },
                                    {
                                        name: "Lead",
                                        value: "Leads"
                                    },
                                    {
                                        name: "Opportunity",
                                        value: "Opportunities"
                                    },
                                    {
                                        name: "Project",
                                        value: "Project"
                                    },
                                    {
                                        name: "Project Task",
                                        value: "ProjectTask"
                                    },
                                    {
                                        name: "Target",
                                        value: "Prospects"
                                    },
                                    {
                                        name: "Quotation",
                                        value: "qt_Header_s"
                                    },
                                    {
                                        name: "Sales Order",
                                        value: "so_Header_s"
                                    },
                                    {
                                        name: "Service Order",
                                        value: "srvc_Order_s"
                                    },
                                    {
                                        name: "Task",
                                        value: "Tasks"
                                    },
                                    {
                                        name: "Purchase Order",
                                        value: "po_Header_s"
                                    }
                                ]
                            },
                            {
                                displayName: 'Module ID',
                                name: 'parent_id',
                                type: 'options',
                                default: '',
                                description: 'Select the related module record',
                                typeOptions: {
                                    loadOptionsMethod: 'getRelatedModuleIds',
                                    loadOptionsDependsOn: [
                                        'additionalFields.relatedToFields.relatedToPair.parent_type'
                                    ],
                                },
                            }
                        ],
                    },
                ],
            },
		],
	},

	// ----------------------------------------
	//             task: delete
	// ----------------------------------------
	{
		displayName: 'Task ID',
		name: 'taskId',
		description: 'ID of the task to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//               task: get
	// ----------------------------------------
	{
		displayName: 'Task ID',
		name: 'taskId',
		description: 'ID of the task to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//             task: getAll
	// ----------------------------------------
	...makeGetAllFields('task'),

	// ----------------------------------------
	//             task: update
	// ----------------------------------------
	{
		displayName: 'Task ID',
		name: 'taskId',
		description: 'ID of the task to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['update'],
			},
		},
	},
    {
		displayName: 'Subject',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['update'],
			},
		},
	},
    {
		displayName: 'Status',
		name: 'status',
		type: 'options',
		default: 'Not Started',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['update'],
			},
		},
        options: [
            {
                name: "Not Started",
                value: "Not Started"
            },
            {
                name: "In Progress",
                value: "In Progress"
            },
            {
                name: "Completed",
                value: "Completed"
            },
            {
                name: "Pending Input",
                value: "Pending Input"
            },
            {
                name: "Deferred",
                value: "Deferred"
            }
        ]
	},
    {
        displayName: 'Priority',
        name: 'priority',
        type: 'options',
        default: '',
        displayOptions: {
			show: {
				resource: ['task'],
				operation: ['update'],
			},
		},
        options: [
            {
                name: "",
                value: ""
            },
            {
                name: "High",
                value: "High"
            },
            {
                name: "Medium",
                value: "Medium"
            },
            {
                name: "Low",
                value: "Low"
            },
        ]
    },
    {
        displayName: 'Start Date',
        name: 'date_start',
        type: 'dateTime',
        default: '',
        displayOptions: {
			show: {
				resource: ['task'],
				operation: ['update'],
			},
		},
    },
    {
        displayName: 'Due Date',
        name: 'date_due',
        type: 'dateTime',
        default: '',
        displayOptions: {
			show: {
				resource: ['task'],
				operation: ['update'],
			},
		},
    },
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['update'],
			},
		},
		options: [
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
                displayName: 'Related To',
                name: 'relatedToFields',
                type: 'fixedCollection',
                typeOptions: {
                    multipleValues: false,
                    multipleValueButtonText: 'Add Related To',
                },
                default: [],
                placeholder: 'Add Related To to Field',
                options: [
                    {
                      name: 'relatedToPair',
                      displayName: 'Related To → Field',
                        values: [
                            {
                                displayName: 'Module Name',
                                name: 'parent_type',
                                type: 'options',
                                default: 'Accounts',
                                options: [
                                    {
                                        name: "Account",
                                        value: "Accounts"
                                    },
                                    {
                                        name: "Ticket",
                                        value: "Tickets"
                                    },
                                    {
                                        name: "Case",
                                        value: "Cases"
                                    },
                                    {
                                        name: "Contact",
                                        value: "Contacts"
                                    },
                                    {
                                        name: "Lead",
                                        value: "Leads"
                                    },
                                    {
                                        name: "Opportunity",
                                        value: "Opportunities"
                                    },
                                    {
                                        name: "Project",
                                        value: "Project"
                                    },
                                    {
                                        name: "Project Task",
                                        value: "ProjectTask"
                                    },
                                    {
                                        name: "Target",
                                        value: "Prospects"
                                    },
                                    {
                                        name: "Quotation",
                                        value: "qt_Header_s"
                                    },
                                    {
                                        name: "Sales Order",
                                        value: "so_Header_s"
                                    },
                                    {
                                        name: "Service Order",
                                        value: "srvc_Order_s"
                                    },
                                    {
                                        name: "Task",
                                        value: "Tasks"
                                    },
                                    {
                                        name: "Purchase Order",
                                        value: "po_Header_s"
                                    }
                                ]
                            },
                            {
                                displayName: 'Module ID',
                                name: 'parent_id',
                                type: 'options',
                                default: '',
                                description: 'Select the related module record',
                                typeOptions: {
                                    loadOptionsMethod: 'getRelatedModuleIds',
                                    loadOptionsDependsOn: [
                                        'additionalFields.relatedToFields.relatedToPair.parent_type'
                                    ],
                                },
                            }
                        ],
                    },
                ],
            },
		],
	},
];
