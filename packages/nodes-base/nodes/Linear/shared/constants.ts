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
