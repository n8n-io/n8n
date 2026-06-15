import { query } from '../../Queries';

// Reuse the node's own query strings so the nock matchers can't drift from the
// real request bodies. Only `variables` are asserted explicitly per request.

export const addCommentRequest = {
	query: query.addComment(),
	variables: {
		issueId: 'test-17',
		body: 'test',
	},
};

export const addCommentWithParentRequest = {
	query: query.addComment(),
	variables: {
		issueId: 'test-17',
		body: 'Add to parent',
		parentId: 'ff12069e-fac8-4b18-8455-cc6b29fa1e77',
	},
};

export const addCommentLink = {
	query: query.addIssueLink(),
	variables: {
		issueId: 'test-17',
		url: 'https://n8n.io',
	},
};

export const issueCreateRequest = {
	query: query.createIssue(),
	variables: {
		teamId: '0a2994c1-5d99-48aa-ab22-8b5ba4711ebc',
		title: 'This is a test issue',
		assigneeId: '1c51f0c4-c552-4614-a534-8de1752ba7d7',
		description: 'test description',
		priorityId: 3,
		stateId: '65a87a3a-5729-4d82-96bf-badccbeb49af',
	},
};

export const getIssueRequest = {
	query: query.getIssue(),
	variables: {
		issueId: 'test-18',
	},
};

export const getManyIssuesRequest = {
	query: query.getIssues(),
	variables: {
		first: 1,
		after: null,
	},
};

export const updateIssueRequest = {
	query: query.updateIssue(),
	variables: {
		issueId: 'test-18',
		assigneeId: '1c51f0c4-c552-4614-a534-8de1752ba7d7',
		description: 'New Description',
		priorityId: 3,
		stateId: '622493c0-f4ee-456d-af65-49a7611ede7a',
		teamId: '0a2994c1-5d99-48aa-ab22-8b5ba4711ebc',
		title: 'New Title',
	},
};

export const deleteIssueRequest = {
	query: query.deleteIssue(),
	variables: {
		issueId: 'test-18',
	},
};
