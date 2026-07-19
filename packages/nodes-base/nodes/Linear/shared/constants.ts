import type { INodeProperties } from 'n8n-workflow';

export const LINEAR_API_URL = 'https://api.linear.app/graphql';

export const PRIORITY_OPTIONS = [
	{ name: 'No Priority', value: 0 },
	{ name: 'Urgent', value: 1 },
	{ name: 'High', value: 2 },
	{ name: 'Medium', value: 3 },
	{ name: 'Low', value: 4 },
];

export const ISSUE_FIELDS = `
	id
	identifier
	title
	priority
	archivedAt
	canceledAt
	completedAt
	createdAt
	updatedAt
	dueDate
	description
	url
	number
	assignee {
		id
		displayName
		email
	}
	state {
		id
		name
		type
	}
	team {
		id
		name
	}
	creator {
		id
		displayName
	}
	labels {
		nodes {
			id
			name
			color
		}
	}
	cycle {
		id
		name
	}
	project {
		id
		name
	}
`;

export const INITIATIVE_FIELDS = `
	id
	name
	description
	targetDate
	status
	color
	icon
	createdAt
	updatedAt
`;

export const PROJECT_MILESTONE_FIELDS = `
	id
	name
	description
	targetDate
	sortOrder
	createdAt
	updatedAt
	project {
		id
		name
	}
`;

export const PROJECT_UPDATE_HEALTH_OPTIONS = [
	{ name: 'On Track', value: 'onTrack' },
	{ name: 'At Risk', value: 'atRisk' },
	{ name: 'Off Track', value: 'offTrack' },
];

export const PROJECT_UPDATE_FIELDS = `
	id
	body
	health
	url
	createdAt
	updatedAt
	project {
		id
		name
	}
	user {
		id
		displayName
	}
`;

export const CUSTOMER_FIELDS = `
	id
	name
	domains
	revenue
	createdAt
	updatedAt
	owner {
		id
		displayName
	}
`;

export const CUSTOMER_NEED_FIELDS = `
	id
	body
	priority
	createdAt
	updatedAt
	customer {
		id
		name
	}
	issue {
		id
		identifier
		title
	}
	project {
		id
		name
	}
`;

export const RELEASE_FIELDS = `
	id
	name
	version
	stage {
		id
		name
	}
	startDate
	targetDate
	url
	updatedAt
`;

export const CUSTOM_VIEW_FIELDS = `
	id
	name
	description
	icon
	color
	shared
	createdAt
	updatedAt
`;

export const ISSUE_RELATION_TYPE_OPTIONS = [
	{ name: 'Blocks', value: 'blocks' },
	{ name: 'Duplicate', value: 'duplicate' },
	{ name: 'Related', value: 'related' },
];

export const ISSUE_RELATION_FIELDS = `
	id
	type
	createdAt
	issue {
		id
		identifier
	}
	relatedIssue {
		id
		identifier
	}
`;

export const CUSTOMER_LOCATOR: INodeProperties = {
	displayName: 'Customer',
	name: 'customerId',
	type: 'resourceLocator',
	required: true,
	default: { mode: 'list', value: '' },
	description: 'The customer the need belongs to',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: { searchListMethod: 'getCustomers', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			hint: 'Enter the customer ID',
		},
	],
};

export const ISSUE_LOCATOR: INodeProperties = {
	displayName: 'Issue',
	name: 'issueId',
	type: 'resourceLocator',
	required: true,
	default: { mode: 'list', value: '' },
	description: 'The issue to operate on',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: { searchListMethod: 'getIssues', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			hint: 'Enter the issue ID',
		},
	],
};

export const PROJECT_LOCATOR: INodeProperties = {
	displayName: 'Project',
	name: 'projectId',
	type: 'resourceLocator',
	required: true,
	default: { mode: 'list', value: '' },
	description: 'The project the record belongs to',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: { searchListMethod: 'getProjects', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			hint: 'Enter the project ID',
		},
	],
};
