import { INodeProperties } from "n8n-workflow";

export const issueOperations = [
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
				name: 'Create',
				value: 'create',
				description: 'Create a new issue',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an issue',
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
				name: 'Changelog',
				value: 'changelog',
				description: 'Get issue changelog',
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
				name: 'Delete',
				value: 'delete',
				description: 'Delete an issue',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const issueFields = [

/* -------------------------------------------------------------------------- */
/*                                issue:create                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Project',
		name: 'project',
		type: 'options',
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
				required : false,
				description: 'Assignee',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				required : false,
				description: 'Description',
			},
			{
				displayName: 'Labels',
				name: 'labels',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
				},
				default: [],
				required : false,
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
				required : false,
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
				required: false,
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
				required : false,
				description: 'Priority',
			},
			{
				displayName: 'Update History',
				name: 'updateHistory',
				type: 'boolean',
				default: false,
				required : false,
				description: `Whether the project in which the issue is created is added to the user's<br/>
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
				required : false,
				description: 'Assignee',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				required : false,
				description: 'Description',
			},
			{
				displayName: 'Issue Type',
				name: 'issueType',
				type: 'options',
				required: false,
				typeOptions: {
					loadOptionsMethod: 'getIssueTypes',
				},
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
				required : false,
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
				required : false,
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
				required: false,
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
				required : false,
				description: 'Priority',
			},
			{
				displayName: 'Summary',
				name: 'summary',
				type: 'string',
				required: false,
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
				required: false,
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
				required: false,
				default: '',
				description: `Use expand to include additional information about the issues in the response.<br/>
				This parameter accepts a comma-separated list. Expand options include:<br/>
				renderedFields Returns field values rendered in HTML format.<br/>
				names Returns the display name of each field.<br/>
				schema Returns the schema describing a field type.<br/>
				transitions Returns all possible transitions for the issue.<br/>
				editmeta Returns information about how each field can be edited.<br/>
				changelog Returns a list of recent updates to an issue, sorted by date, starting from the most recent.<br/>
				versionedRepresentations Returns a JSON array for each version of a field's value, with the highest number<br/>
				representing the most recent version. Note: When included in the request, the fields parameter is ignored.`,
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				required: false,
				default: '',
				description: `A list of fields to return for the issue.<br/>
				This parameter accepts a comma-separated list.<br/>
				Use it to retrieve a subset of fields. Allowed values:<br/>
				*all Returns all fields.<br/>
				*navigable Returns navigable fields.<br/>
				Any issue field, prefixed with a minus to exclude.<br/>`,
			},
			{
				displayName: 'Fields By Key',
				name: 'fieldsByKey',
				type: 'boolean',
				required: false,
				default: false,
				description: `Indicates whether fields in fields are referenced by keys rather than IDs.<br/>
				This parameter is useful where fields have been added by a connect app and a field's key<br/>
				may differ from its ID.`,
			},
			{
				displayName: 'Properties',
				name: 'properties',
				type: 'string',
				required: false,
				default: '',
				description: `A list of issue properties to return for the issue.<br/>
				This parameter accepts a comma-separated list. Allowed values:<br/>
				*all Returns all issue properties.<br/>
				Any issue property key, prefixed with a minus to exclude.<br/>
				Examples:<br/>
				*all Returns all properties.<br/>
				*all,-prop1 Returns all properties except prop1.<br/>
				prop1,prop2 Returns prop1 and prop2 properties.<br/>
				This parameter may be specified multiple times. For example, properties=prop1,prop2& properties=prop3.`,
			},
			{
				displayName: 'Update History',
				name: 'updateHistory',
				type: 'boolean',
				required: false,
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
				type: 'options',
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
				description: `A list of fields to return for each issue, use it to retrieve a subset of fields. This parameter accepts a comma-separated list. Expand options include:<br/>
				*all Returns all fields.<br/>
				*navigable Returns navigable fields.<br/>
				Any issue field, prefixed with a minus to exclude.<br/>`,
			},
			{
				displayName: 'Fields By Key',
				name: 'fieldsByKey',
				type: 'boolean',
				required: false,
				default: false,
				description: `Indicates whether fields in fields are referenced by keys rather than IDs.<br/>
				This parameter is useful where fields have been added by a connect app and a field's key<br/>
				may differ from its ID.`,
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
				required: false,
				default: '',
				description: 'The HTML body of the email notification for the issue.',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				required: false,
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
				required: false,
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
		required: false,
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
		required: false,
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
				required: false,
				default: '',
				description: `Use expand to include additional information about transitions in the response.<br/>
				 This parameter accepts transitions.fields, which returns information about the fields in the<br/>
				 transition screen for each transition. Fields hidden from the screen are not returned. Use this<br/>
				 information to populate the fields and update fields in Transition issue.`,
			},
			{
				displayName: 'Transition ID',
				name: 'transitionId',
				type: 'string',
				required: false,
				default: '',
				description: 'The ID of the transition.',
			},
			{
				displayName: 'Skip Remote Only Condition',
				name: 'skipRemoteOnlyCondition',
				type: 'boolean',
				required: false,
				default: false,
				description: `Indicates whether transitions with the condition Hide<br/>
				From User Condition are included in the response.`,
			},
		],
	},
] as INodeProperties[];
