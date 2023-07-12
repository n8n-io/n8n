import { TLP } from './interfaces';

export const alertCommonFields = [
	{
		displayName: 'Title',
		id: 'title',
		type: 'string',
	},
	{
		displayName: 'Description',
		id: 'description',
		type: 'string',
	},
	{
		displayName: 'Type',
		id: 'type',
		type: 'string',
	},
	{
		displayName: 'Source',
		id: 'source',
		type: 'string',
	},
	{
		displayName: 'Source Reference',
		id: 'sourceRef',
		type: 'string',
	},
	{
		displayName: 'External Link',
		id: 'externalLink',
		type: 'string',
	},
	{
		displayName: 'Severity (Severity of information)',
		id: 'severity',
		type: 'options',
		options: [
			{
				name: 'Low',
				value: 1,
			},
			{
				name: 'Medium',
				value: 2,
			},
			{
				name: 'High',
				value: 3,
			},
			{
				name: 'Critical',
				value: 4,
			},
		],
	},
	{
		displayName: 'Date',
		id: 'date',
		type: 'dateTime',
	},
	{
		displayName: 'Last Sync Date',
		id: 'lastSyncDate',
		type: 'dateTime',
	},
	{
		displayName: 'Tags',
		id: 'tags',
		type: 'string',
	},
	{
		displayName: 'Follow',
		id: 'follow',
		type: 'boolean',
	},
	{
		displayName: 'Flag',
		id: 'flag',
		type: 'boolean',
	},
	{
		displayName: 'TLP (Confidentiality of information)',
		id: 'tlp',
		type: 'options',
		options: [
			{
				name: 'White',
				value: TLP.white,
			},
			{
				name: 'Green',
				value: TLP.green,
			},
			{
				name: 'Amber',
				value: TLP.amber,
			},
			{
				name: 'Red',
				value: TLP.red,
			},
		],
	},
	{
		displayName: 'PAP (Level of exposure of information)',
		id: 'pap',
		type: 'options',
		options: [
			{
				name: 'White',
				value: TLP.white,
			},
			{
				name: 'Green',
				value: TLP.green,
			},
			{
				name: 'Amber',
				value: TLP.amber,
			},
			{
				name: 'Red',
				value: TLP.red,
			},
		],
	},
	{
		displayName: 'Summary',
		id: 'summary',
		type: 'string',
	},
	{
		displayName: 'Status',
		id: 'status',
		type: 'options',
	},
	{
		displayName: 'Case Template',
		id: 'caseTemplate',
		type: 'options',
	},
	{
		displayName: 'Add Tags',
		id: 'addTags',
		type: 'string',
		canBeUsedToMatch: false,
	},
	{
		displayName: 'Remove Tags',
		id: 'removeTags',
		type: 'string',
		canBeUsedToMatch: false,
	},
];

export const caseCommonFields = [
	{
		displayName: 'Title',
		id: 'title',
		type: 'string',
	},
	{
		displayName: 'Description',
		id: 'description',
		type: 'string',
	},
	{
		displayName: 'Severity (Severity of information)',
		id: 'severity',
		type: 'options',
		options: [
			{
				name: 'Low',
				value: 1,
			},
			{
				name: 'Medium',
				value: 2,
			},
			{
				name: 'High',
				value: 3,
			},
			{
				name: 'Critical',
				value: 4,
			},
		],
	},
	{
		displayName: 'Start Date',
		id: 'startDate',
		type: 'dateTime',
	},
	{
		displayName: 'End Date',
		id: 'endDate',
		type: 'dateTime',
	},
	{
		displayName: 'Tags',
		id: 'tags',
		type: 'string',
	},
	{
		displayName: 'Flag',
		id: 'flag',
		type: 'boolean',
	},
	{
		displayName: 'TLP (Confidentiality of information)',
		id: 'tlp',
		type: 'options',
		options: [
			{
				name: 'White',
				value: TLP.white,
			},
			{
				name: 'Green',
				value: TLP.green,
			},
			{
				name: 'Amber',
				value: TLP.amber,
			},
			{
				name: 'Red',
				value: TLP.red,
			},
		],
	},
	{
		displayName: 'PAP (Level of exposure of information)',
		id: 'pap',
		type: 'options',
		options: [
			{
				name: 'White',
				value: TLP.white,
			},
			{
				name: 'Green',
				value: TLP.green,
			},
			{
				name: 'Amber',
				value: TLP.amber,
			},
			{
				name: 'Red',
				value: TLP.red,
			},
		],
	},
	{
		displayName: 'Summary',
		id: 'summary',
		type: 'string',
	},
	{
		displayName: 'Status',
		id: 'status',
		type: 'options',
	},
	{
		displayName: 'Assignee',
		id: 'assignee',
		type: 'options',
	},
	{
		displayName: 'Case Template',
		id: 'caseTemplate',
		type: 'options',
	},
	{
		displayName: 'Tasks',
		id: 'tasks',
		type: 'array',
	},
	{
		displayName: 'Sharing Parameters',
		id: 'sharingParameters',
		type: 'array',
	},
	{
		displayName: 'Impact Status',
		id: 'impactStatus',
		type: 'string',
	},
	{
		displayName: 'Task Rule',
		id: 'taskRule',
		type: 'string',
	},
	{
		displayName: 'Observable Rule',
		id: 'observableRule',
		type: 'string',
	},
	{
		displayName: 'Add Tags',
		id: 'addTags',
		type: 'string',
	},
	{
		displayName: 'Remove Tags',
		id: 'removeTags',
		type: 'string',
	},
];

export const taskCommonFields = [
	{
		displayName: 'Title',
		id: 'title',
		type: 'string',
	},
	{
		displayName: 'Description',
		id: 'description',
		type: 'string',
	},
	{
		displayName: 'Group',
		id: 'group',
		type: 'string',
	},
	{
		displayName: 'Status',
		id: 'status',
		type: 'stirng',
	},
	{
		displayName: 'Flag',
		id: 'flag',
		type: 'boolean',
	},
	{
		displayName: 'Start Date',
		id: 'startDate',
		type: 'dateTime',
	},
	{
		displayName: 'Due Date',
		id: 'dueDate',
		type: 'dateTime',
	},
	{
		displayName: 'End Date',
		id: 'endDate',
		type: 'dateTime',
	},
	{
		displayName: 'Assignee',
		id: 'assignee',
		type: 'options',
	},
	{
		displayName: 'Mandatory',
		id: 'mandatory',
		type: 'boolean',
	},
	{
		displayName: 'Order',
		id: 'order',
		type: 'number',
	},
];

export const observableCommonFields = [
	{
		displayName: 'Data Type',
		id: 'dataType',
		type: 'options',
	},
	{
		displayName: 'Data',
		id: 'data',
		type: 'string',
	},
	{
		displayName: 'Start Date',
		id: 'startDate',
		type: 'dateTime',
	},
	{
		displayName: 'Message',
		id: 'message',
		type: 'string',
	},
	{
		displayName: 'Tags',
		id: 'tags',
		type: 'string',
	},
	{
		displayName: 'TLP (Confidentiality of information)',
		id: 'tlp',
		type: 'options',
		options: [
			{
				name: 'White',
				value: TLP.white,
			},
			{
				name: 'Green',
				value: TLP.green,
			},
			{
				name: 'Amber',
				value: TLP.amber,
			},
			{
				name: 'Red',
				value: TLP.red,
			},
		],
	},
	{
		displayName: 'PAP (Level of exposure of information)',
		id: 'pap',
		type: 'options',
		options: [
			{
				name: 'White',
				value: TLP.white,
			},
			{
				name: 'Green',
				value: TLP.green,
			},
			{
				name: 'Amber',
				value: TLP.amber,
			},
			{
				name: 'Red',
				value: TLP.red,
			},
		],
	},
	{
		displayName: 'IOC',
		id: 'ioc',
		type: 'boolean',
	},
	{
		displayName: 'Sighted',
		id: 'sighted',
		type: 'boolean',
	},
	{
		displayName: 'Sighted At',
		id: 'sightedAt',
		type: 'dateTime',
	},
	{
		displayName: 'Ignore Similarity',
		id: 'ignoreSimilarity',
		type: 'boolean',
	},
	{
		displayName: 'Is Zip',
		id: 'isZip',
		type: 'boolean',
	},
	{
		displayName: 'Zip Password',
		id: 'zipPassword',
		type: 'string',
	},
	{
		displayName: 'Add Tags',
		id: 'addTags',
		type: 'string',
	},
	{
		displayName: 'Remove Tags',
		id: 'removeTags',
		type: 'string',
	},
];
