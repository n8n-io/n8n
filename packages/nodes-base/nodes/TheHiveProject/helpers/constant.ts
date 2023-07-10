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
