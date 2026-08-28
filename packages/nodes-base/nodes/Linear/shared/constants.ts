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

type LocatorOptions = {
	name: string;
	displayName: string;
	description: string;
	searchListMethod: string;
	idHint: string;
	required?: boolean;
	url?: { placeholder: string; regex: string; errorMessage: string };
};

/**
 * Builds a resource-locator input: pick from a searchable list, paste an ID, or
 * (where Linear's API resolves it) paste a URL.
 */
export function buildLocator({
	name,
	displayName,
	description,
	searchListMethod,
	idHint,
	required = true,
	url,
}: LocatorOptions): INodeProperties {
	return {
		displayName,
		name,
		type: 'resourceLocator',
		required,
		default: { mode: 'list', value: '' },
		description,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod, searchable: true },
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				hint: idHint,
			},
			...(url
				? [
						{
							displayName: 'By URL',
							name: 'url',
							type: 'string' as const,
							placeholder: url.placeholder,
							validation: [
								{
									type: 'regex' as const,
									properties: { regex: url.regex, errorMessage: url.errorMessage },
								},
							],
							extractValue: { type: 'regex' as const, regex: url.regex },
						},
					]
				: []),
		],
	};
}

export const CUSTOMER_LOCATOR: INodeProperties = buildLocator({
	name: 'customerId',
	displayName: 'Customer',
	description: 'The customer the need belongs to',
	searchListMethod: 'getCustomers',
	idHint: 'Enter the customer ID',
});

// Linear issue URLs carry the identifier (e.g. .../issue/CE-123/slug), and
// `issue(id:)` resolves identifiers as well as UUIDs.
export const ISSUE_LOCATOR: INodeProperties = buildLocator({
	name: 'issueId',
	displayName: 'Issue',
	description: 'The issue to operate on',
	searchListMethod: 'getIssues',
	idHint: 'Enter the issue ID or identifier, e.g. CE-123',
	url: {
		placeholder: 'https://linear.app/acme/issue/CE-123/some-issue',
		regex: 'https:\\/\\/linear\\.app\\/[^\\/]+\\/issue\\/([A-Za-z0-9]+-[0-9]+)',
		errorMessage: 'Not a valid Linear issue URL',
	},
});

export const PROJECT_LOCATOR: INodeProperties = buildLocator({
	name: 'projectId',
	displayName: 'Project',
	description: 'The project the record belongs to',
	searchListMethod: 'getProjects',
	idHint: 'Enter the project ID',
});

export const RELATED_ISSUE_LOCATOR: INodeProperties = buildLocator({
	name: 'relatedIssueId',
	displayName: 'Related Issue',
	description: 'The issue that is related to the origin issue',
	searchListMethod: 'getIssues',
	idHint: 'Enter the issue ID or identifier, e.g. CE-123',
	url: {
		placeholder: 'https://linear.app/acme/issue/CE-123/some-issue',
		regex: 'https:\\/\\/linear\\.app\\/[^\\/]+\\/issue\\/([A-Za-z0-9]+-[0-9]+)',
		errorMessage: 'Not a valid Linear issue URL',
	},
});

export const TEAM_LOCATOR: INodeProperties = buildLocator({
	name: 'teamId',
	displayName: 'Team',
	description: 'The team the record belongs to',
	searchListMethod: 'getTeams',
	idHint: 'Enter the team ID',
});

export const USER_LOCATOR: INodeProperties = buildLocator({
	name: 'userId',
	displayName: 'User',
	description: 'The user to operate on',
	searchListMethod: 'getUsers',
	idHint: 'Enter the user ID',
});

export const ASSIGNEE_LOCATOR: INodeProperties = buildLocator({
	name: 'assigneeId',
	displayName: 'Assignee',
	description: 'The user the issue is assigned to',
	searchListMethod: 'getUsers',
	idHint: 'Enter the user ID',
	required: false,
});

export const LEAD_LOCATOR: INodeProperties = buildLocator({
	name: 'leadId',
	displayName: 'Lead',
	description: 'The user who leads the project',
	searchListMethod: 'getUsers',
	idHint: 'Enter the user ID',
	required: false,
});

export const STATE_LOCATOR: INodeProperties = buildLocator({
	name: 'stateId',
	displayName: 'State',
	description: 'The workflow state of the issue',
	searchListMethod: 'getStates',
	idHint: 'Enter the workflow state ID',
	required: false,
});

export const WORKFLOW_STATE_LOCATOR: INodeProperties = buildLocator({
	name: 'workflowStateId',
	displayName: 'Workflow State',
	description: 'The workflow state to operate on',
	searchListMethod: 'getStates',
	idHint: 'Enter the workflow state ID',
});

export const CYCLE_LOCATOR: INodeProperties = buildLocator({
	name: 'cycleId',
	displayName: 'Cycle',
	description: 'The cycle to operate on',
	searchListMethod: 'getCycles',
	idHint: 'Enter the cycle ID',
});

export const LABEL_LOCATOR: INodeProperties = buildLocator({
	name: 'labelId',
	displayName: 'Label',
	description: 'The label to operate on',
	searchListMethod: 'getLabels',
	idHint: 'Enter the label ID',
});

export const DOCUMENT_LOCATOR: INodeProperties = buildLocator({
	name: 'documentId',
	displayName: 'Document',
	description: 'The document to operate on',
	searchListMethod: 'getDocuments',
	idHint: 'Enter the document ID',
});

export const RELEASE_LOCATOR: INodeProperties = buildLocator({
	name: 'releaseId',
	displayName: 'Release',
	description: 'The release to operate on',
	searchListMethod: 'getReleases',
	idHint: 'Enter the release ID',
});

export const VIEW_LOCATOR: INodeProperties = buildLocator({
	name: 'viewId',
	displayName: 'Custom View',
	description: 'The custom view to operate on',
	searchListMethod: 'getViews',
	idHint: 'Enter the custom view ID',
});
