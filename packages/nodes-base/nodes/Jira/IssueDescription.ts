import {
	INodeProperties,
} from 'n8n-workflow';

export const issueOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
			},
		},
		options: [
			{
				name: 'Changelog',
				value: 'changelog',
				description: 'Get issue changelog',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new issue',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an issue',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an issue',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all issues',
			},
			{
				name: 'Notify',
				value: 'notify',
				description: 'Create an email notification for an issue and add it to the mail queue',
			},
			{
				name: 'Status',
				value: 'transitions',
				description: `Return either all transitions or a transition that can be performed by the user on an issue, based on the issue's status`,
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an issue',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const issueFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                issue:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Project',
		name: 'project',
		type: 'options',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'create',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getProjects',
			loadOptionsDependsOn: [
				'jiraVersion',
			],
		},
		description: 'Project',
	},
	{
		displayName: 'Issue Type',
		name: 'issueType',
		type: 'options',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'create',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getIssueTypes',
			loadOptionsDependsOn: [
				'project',
			],
		},
		description: 'Issue Types',
	},
	{
		displayName: 'Summary',
		name: 'summary',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'Summary',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Assignee',
				name: 'assignee',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'Assignee',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description',
			},
			{
				displayName: 'Components',
				name: 'componentIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getProjectComponents',
					loadOptionsDependsOn: [
						'project',
					],
				},
				default: [],
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: '',
				placeholder: 'Add Custom Field',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field ID',
								name: 'fieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
									loadOptionsDependsOn: [
										'project',
									],
								},
								description: 'ID of the field to set.',
								default: '',
							},
							{
								displayName: 'Field Value',
								name: 'fieldValue',
								type: 'string',
								description: 'Value of the field to set.',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Labels',
				name: 'labels',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
				},
				default: [],
				description: 'Labels',
				displayOptions: {
					show: {
						'/jiraVersion': [
							'cloud',
						],
					},
				},
			},
			{
				displayName: 'Labels',
				name: 'serverLabels',
				type: 'string',
				default: [],
				description: 'Labels',
				displayOptions: {
					show: {
						'/jiraVersion': [
							'server',
						],
					},
				},
				typeOptions: {
					multipleValues: true,
				},
			},
			{
				displayName: 'Parent Issue Key',
				name: 'parentIssueKey',
				type: 'string',
				default: '',
				description: 'Parent Issue Key',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPriorities',
				},
				default: '',
				description: 'Priority',
			},
			{
				displayName: 'Reporter',
				name: 'reporter',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'Reporter',
			},
			{
				displayName: 'Update History',
				name: 'updateHistory',
				type: 'boolean',
				default: false,
				description: `Whether the project in which the issue is created is added to the user's
				Recently viewed project list, as shown under Projects in Jira.`,
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                issue:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Issue Key',
		name: 'issueKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'Issue Key',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Assignee',
				name: 'assignee',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'Assignee',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: '',
				placeholder: 'Add Custom Field',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field ID',
								name: 'fieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
									loadOptionsDependsOn: [
										'issueKey',
									],
								},
								description: 'ID of the field to set.',
								default: '',
							},
							{
								displayName: 'Field Value',
								name: 'fieldValue',
								type: 'string',
								description: 'Value of the field to set.',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Issue Type',
				name: 'issueType',
				type: 'string',
				default: '',
				description: 'Issue Types',
			},
			{
				displayName: 'Labels',
				name: 'labels',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
				},
				default: [],
				description: 'Labels',
				displayOptions: {
					show: {
						'/jiraVersion': [
							'cloud',
						],
					},
				},
			},
			{
				displayName: 'Labels',
				name: 'serverLabels',
				type: 'string',
				default: [],
				description: 'Labels',
				displayOptions: {
					show: {
						'/jiraVersion': [
							'server',
						],
					},
				},
				typeOptions: {
					multipleValues: true,
				},
			},
			{
				displayName: 'Parent Issue Key',
				name: 'parentIssueKey',
				type: 'string',
				default: '',
				description: 'Parent Issue Key',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPriorities',
				},
				default: '',
				description: 'Priority',
			},
			{
				displayName: 'Reporter',
				name: 'reporter',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'Reporter',
			},
			{
				displayName: 'Summary',
				name: 'summary',
				type: 'string',
				default: '',
				description: 'Summary',
			},
			{
				displayName: 'Status ID',
				name: 'statusId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTransitions',
				},
				default: '',
				description: 'The ID of the issue status.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                issue:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Issue Key',
		name: 'issueKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'Issue Key',
	},
	{
		displayName: 'Delete Subtasks',
		name: 'deleteSubtasks',
		type: 'boolean',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'delete',
				],
			},
		},
		default: false,
		description: 'Delete Subtasks',
	},

	/* -------------------------------------------------------------------------- */
	/*                                  issue:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Issue Key',
		name: 'issueKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'Issue Key',
	},
	{
		displayName: 'Simplify Output',
		name: 'simplifyOutput',
		type: 'boolean',
		required: false,
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'get',
				],
			},
		},
		default: false,
		description: `Return a simplified output of the issues fields.`,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				displayName: 'Expand',
				name: 'expand',
				type: 'string',
				default: '',
				description: `<p>Use expand to include additional information about the issues in the response. This parameter accepts a comma-separated list. Expand options include:
				<ul>
					<li><code>renderedFields</code> Returns field values rendered in HTML format.</li>
					<li><code>names</code> Returns the display name of each field.</li>
					<li><code>schema</code> Returns the schema describing a field type.</li>
					<li><code>transitions</code> Returns all possible transitions for the issue.</li>
					<li><code>editmeta</code> Returns information about how each field can be edited.</li>
					<li><code>changelog</code> Returns a list of recent updates to an issue, sorted by date, starting from the most recent.</li>
					<li><code>versionedRepresentations</code> Returns a JSON array for each version of a field's value, with the highest number representing the most recent version. Note: When included in the request, the fields parameter is ignored.</li>
				</ul>`,
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: `A list of fields to return for the issue. This parameter accepts a comma-separated list. Use it to retrieve a subset of fields. Allowed values: <code>*all</code> Returns all fields. <code>*navigable</code> Returns navigable fields. Any issue field, prefixed with a minus to exclude.`,
			},
			{
				displayName: 'Fields By Key',
				name: 'fieldsByKey',
				type: 'boolean',
				default: false,
				description: `Indicates whether fields in fields are referenced by keys rather than IDs. This parameter is useful where fields have been added by a connect app and a field's key may differ from its ID.`,
			},
			{
				displayName: 'Properties',
				name: 'properties',
				type: 'string',
				default: '',
				description: `A list of issue properties to return for the issue. This parameter accepts a comma-separated list. Allowed values: <code>*all</code> Returns all issue properties. Any issue property key, prefixed with a minus to exclude. Examples: <code>*all</code> Returns all properties. <code>*all</code>,-prop1 Returns all properties except prop1. <code>prop1,prop2</code> Returns prop1 and prop2 properties. This parameter may be specified multiple times. For example, properties=prop1,prop2& properties=prop3.`,
			},
			{
				displayName: 'Update History',
				name: 'updateHistory',
				type: 'boolean',
				default: false,
				description: `Whether the project in which the issue is created is added to the user's
				Recently viewed project list, as shown under Projects in Jira. This also populates the
				JQL issues search lastViewed field.`,
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  issue:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'issue',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Expand',
				name: 'expand',
				type: 'multiOptions',
				default: '',
				options: [
					{
						name: 'Changelog',
						value: 'changelog',
						description: 'Returns a list of recent updates to an issue, sorted by date, starting from the most recent.',
					},
					{
						name: 'Editmeta',
						value: 'editmeta',
						description: 'Returns information about how each field can be edited',
					},
					{
						name: 'Names',
						value: 'names',
						description: 'Returns the display name of each field',
					},
					{
						name: 'Operations',
						value: 'operations',
						description: 'Returns all possible operations for the issue.',
					},
					{
						name: 'Rendered Fields',
						value: 'renderedFields',
						description: ' Returns field values rendered in HTML format.',
					},
					{
						name: 'Schema',
						value: 'schema',
						description: 'Returns the schema describing a field type.',
					},
					{
						name: 'Transitions',
						value: 'transitions',
						description: ' Returns all possible transitions for the issue.',
					},
					{
						name: 'Versioned Representations',
						value: 'versionedRepresentations',
						description: `JSON array containing each version of a field's value`,
					},
				],
				description: `Use expand to include additional information about issues in the response`,
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '*navigable',
				description: `A list of fields to return for each issue, use it to retrieve a subset of fields. This parameter accepts a comma-separated list. Expand options include: <code>*all</code> Returns all fields. <code>*navigable</code> Returns navigable fields. Any issue field, prefixed with a minus to exclude.`,
			},
			{
				displayName: 'Fields By Key',
				name: 'fieldsByKey',
				type: 'boolean',
				default: false,
				description: `Indicates whether fields in fields are referenced by keys rather than IDs. This parameter is useful where fields have been added by a connect app and a field's key may differ from its ID.`,
			},
			{
				displayName: ' JQL',
				name: 'jql',
				type: 'string',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				description: 'A JQL expression.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                               issue:changelog                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Issue Key',
		name: 'issueKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'changelog',
				],
			},
		},
		default: '',
		description: 'Issue Key',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'changelog',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'changelog',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                issue:notify                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Issue Key',
		name: 'issueKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'notify',
				],
			},
		},
		default: '',
		description: 'Issue Key',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		description: '',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'notify',
				],
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
				resource: [
					'issue',
				],
				operation: [
					'notify',
				],
			},
		},
		options: [
			{
				displayName: 'HTML Body',
				name: 'htmlBody',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'The HTML body of the email notification for the issue.',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: `The subject of the email notification for the issue. If this is not specified,
				then the subject is set to the issue key and summary.`,
			},
			{
				displayName: 'Text Body',
				name: 'textBody',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: `The subject of the email notification for the issue.
				If this is not specified, then the subject is set to the issue key and summary.`,
			},
		],
	},
	{
		displayName: 'Notification Recipients',
		name: 'notificationRecipientsUi',
		type: 'fixedCollection',
		placeholder: 'Add Recipients',
		typeOptions: {
			multipleValues: false,
		},
		description: 'The recipients of the email notification for the issue.',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'notify',
				],
				jsonParameters: [
					false,
				],
			},
		},
		options: [
			{
				name: 'notificationRecipientsValues',
				displayName: 'Recipients',
				values: [
					{
						displayName: 'Reporter',
						name: 'reporter',
						type: 'boolean',
						description: `Indicates whether the notification should be sent to the issue's reporter.`,
						default: false,
					},
					{
						displayName: 'Assignee',
						name: 'assignee',
						type: 'boolean',
						default: false,
						description: `Indicates whether the notification should be sent to the issue's assignees.`,
					},
					{
						displayName: 'Watchers',
						name: 'watchers',
						type: 'boolean',
						default: false,
						description: `Indicates whether the notification should be sent to the issue's assignees.`,
					},
					{
						displayName: 'Voters',
						name: 'voters',
						type: 'boolean',
						default: false,
						description: `Indicates whether the notification should be sent to the issue's voters.`,
					},
					{
						displayName: 'Users',
						name: 'users',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getUsers',
						},
						default: [],
						description: `List of users to receive the notification.`,
					},
					{
						displayName: 'Groups',
						name: 'groups',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getGroups',
						},
						default: [],
						description: `List of groups to receive the notification.`,
					},
				],

			},
		],
	},
	{
		displayName: 'Notification Recipients',
		name: 'notificationRecipientsJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'notify',
				],
				jsonParameters: [
					true,
				],
			},
		},
		default: '',
		description: 'The recipients of the email notification for the issue.',
	},
	{
		displayName: 'Notification Recipients Restrictions',
		name: 'notificationRecipientsRestrictionsUi',
		type: 'fixedCollection',
		placeholder: 'Add Recipients Restriction',
		typeOptions: {
			multipleValues: false,
		},
		description: 'Restricts the notifications to users with the specified permissions.',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'notify',
				],
				jsonParameters: [
					false,
				],
			},
		},
		options: [
			{
				name: 'notificationRecipientsRestrictionsValues',
				displayName: 'Recipients Restrictions',
				values: [
					{
						displayName: 'Users',
						name: 'users',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getUsers',
						},
						default: [],
						description: `List of users to receive the notification.`,
					},
					{
						displayName: 'Groups',
						name: 'groups',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getGroups',
						},
						default: [],
						description: `List of groups to receive the notification.`,
					},
				],

			},
		],
	},
	{
		displayName: 'Notification Recipients Restrictions',
		name: 'notificationRecipientsRestrictionsJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'notify',
				],
				jsonParameters: [
					true,
				],
			},
		},
		default: '',
		description: 'Restricts the notifications to users with the specified permissions.',
	},

	/* -------------------------------------------------------------------------- */
	/*                              issue:transitions                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Issue Key',
		name: 'issueKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'transitions',
				],
			},
		},
		default: '',
		description: 'Issue Key',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'transitions',
				],
			},
		},
		options: [
			{
				displayName: 'Expand',
				name: 'expand',
				type: 'string',
				default: '',
				description: `Use expand to include additional information about transitions in the response. This parameter accepts transitions.fields, which returns information about the fields in the transition screen for each transition. Fields hidden from the screen are not returned. Use this information to populate the fields and update fields in Transition issue.`,
			},
			{
				displayName: 'Transition ID',
				name: 'transitionId',
				type: 'string',
				default: '',
				description: 'The ID of the transition.',
			},
			{
				displayName: 'Skip Remote Only Condition',
				name: 'skipRemoteOnlyCondition',
				type: 'boolean',
				default: false,
				description: `Indicates whether transitions with the condition Hide
				From User Condition are included in the response.`,
			},
		],
	},
];
