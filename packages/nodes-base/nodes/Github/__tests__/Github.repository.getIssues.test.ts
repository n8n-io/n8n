import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Github Node - Repository getIssues', () => {
	const credentials = {
		githubApi: {
			accessToken: 'test-token',
			server: 'https://api.github.com',
			user: 'testuser',
		},
	};

	describe('Basic getIssues Operation', () => {
		beforeAll(() => {
			const mock = nock('https://api.github.com');

			mock
				.get('/repos/testowner/testrepo/issues')
				.query(true)
				.reply(200, [
					{
						url: 'https://api.github.com/repos/testowner/testrepo/issues/1',
						repository_url: 'https://api.github.com/repos/testowner/testrepo',
						labels_url: 'https://api.github.com/repos/testowner/testrepo/issues/1/labels{/name}',
						comments_url: 'https://api.github.com/repos/testowner/testrepo/issues/1/comments',
						events_url: 'https://api.github.com/repos/testowner/testrepo/issues/1/events',
						html_url: 'https://github.com/testowner/testrepo/issues/1',
						id: 1,
						number: 1,
						title: 'Found a bug',
						user: {
							login: 'testuser',
							id: 1,
							node_id: 'MDQ6VXNlcjE=',
							avatar_url: 'https://github.com/images/error/testuser_happy.gif',
							gravatar_id: '',
							url: 'https://api.github.com/users/testuser',
							html_url: 'https://github.com/testuser',
							type: 'User',
							site_admin: false,
						},
						labels: [
							{
								id: 208045946,
								node_id: 'MDU6TGFiZWwyMDgwNDU5NDY=',
								url: 'https://api.github.com/repos/testowner/testrepo/labels/bug',
								name: 'bug',
								description: "Something isn't working",
								color: 'd73a49',
								default: true,
							},
						],
						state: 'open',
						locked: false,
						assignee: null,
						assignees: [],
						milestone: null,
						comments: 0,
						created_at: '2011-04-22T13:33:48Z',
						updated_at: '2011-04-22T13:33:48Z',
						closed_at: null,
						author_association: 'COLLABORATOR',
						active_lock_reason: null,
						body: "I'm having a problem with this.",
						reactions: {
							url: 'https://api.github.com/repos/testowner/testrepo/issues/1/reactions',
							total_count: 0,
							'+1': 0,
							'-1': 0,
							laugh: 0,
							hooray: 0,
							confused: 0,
							heart: 0,
							rocket: 0,
							eyes: 0,
						},
						timeline_url: 'https://api.github.com/repos/testowner/testrepo/issues/1/timeline',
						performed_via_github_app: null,
						state_reason: null,
					},
					{
						url: 'https://api.github.com/repos/testowner/testrepo/issues/2',
						repository_url: 'https://api.github.com/repos/testowner/testrepo',
						labels_url: 'https://api.github.com/repos/testowner/testrepo/issues/2/labels{/name}',
						comments_url: 'https://api.github.com/repos/testowner/testrepo/issues/2/comments',
						events_url: 'https://api.github.com/repos/testowner/testrepo/issues/2/events',
						html_url: 'https://github.com/testowner/testrepo/issues/2',
						id: 2,
						number: 2,
						title: 'Feature request',
						user: {
							login: 'anotheruser',
							id: 2,
							node_id: 'MDQ6VXNlcjI=',
							avatar_url: 'https://github.com/images/error/anotheruser_happy.gif',
							gravatar_id: '',
							url: 'https://api.github.com/users/anotheruser',
							html_url: 'https://github.com/anotheruser',
							type: 'User',
							site_admin: false,
						},
						labels: [
							{
								id: 208045947,
								node_id: 'MDU6TGFiZWwyMDgwNDU5NDc=',
								url: 'https://api.github.com/repos/testowner/testrepo/labels/enhancement',
								name: 'enhancement',
								description: 'New feature or request',
								color: 'a2eeef',
								default: true,
							},
						],
						state: 'open',
						locked: false,
						assignee: {
							login: 'assigneduser',
							id: 3,
							node_id: 'MDQ6VXNlcjM=',
							avatar_url: 'https://github.com/images/error/assigneduser_happy.gif',
							gravatar_id: '',
							url: 'https://api.github.com/users/assigneduser',
							html_url: 'https://github.com/assigneduser',
							type: 'User',
							site_admin: false,
						},
						assignees: [
							{
								login: 'assigneduser',
								id: 3,
								node_id: 'MDQ6VXNlcjM=',
								avatar_url: 'https://github.com/images/error/assigneduser_happy.gif',
								gravatar_id: '',
								url: 'https://api.github.com/users/assigneduser',
								html_url: 'https://github.com/assigneduser',
								type: 'User',
								site_admin: false,
							},
						],
						milestone: {
							url: 'https://api.github.com/repos/testowner/testrepo/milestones/1',
							html_url: 'https://github.com/testowner/testrepo/milestone/1',
							labels_url: 'https://api.github.com/repos/testowner/testrepo/milestones/1/labels',
							id: 1002604,
							number: 1,
							state: 'open',
							title: 'v1.0',
							description: 'Tracking milestone for version 1.0',
							creator: {
								login: 'testowner',
								id: 4,
								node_id: 'MDQ6VXNlcjQ=',
								avatar_url: 'https://github.com/images/error/testowner_happy.gif',
								gravatar_id: '',
								url: 'https://api.github.com/users/testowner',
								html_url: 'https://github.com/testowner',
								type: 'User',
								site_admin: false,
							},
							open_issues: 4,
							closed_issues: 8,
							created_at: '2011-04-10T20:09:31Z',
							updated_at: '2014-03-03T18:58:10Z',
							closed_at: null,
							due_on: '2018-09-22T23:39:01Z',
							node_id: 'MDk6TWlsZXN0b25lMTAwMjYwNA==',
						},
						comments: 3,
						created_at: '2011-04-22T13:33:48Z',
						updated_at: '2011-04-22T13:33:48Z',
						closed_at: null,
						author_association: 'COLLABORATOR',
						active_lock_reason: null,
						body: 'It would be great if we could add this feature.',
						reactions: {
							url: 'https://api.github.com/repos/testowner/testrepo/issues/2/reactions',
							total_count: 5,
							'+1': 3,
							'-1': 1,
							laugh: 0,
							hooray: 0,
							confused: 0,
							heart: 1,
							rocket: 0,
							eyes: 0,
						},
						timeline_url: 'https://api.github.com/repos/testowner/testrepo/issues/2/timeline',
						performed_via_github_app: null,
						state_reason: null,
					},
				]);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['getRepositoryIssues.workflow.json'],
		});
	});

	describe('Limited getIssues Operation', () => {
		beforeAll(() => {
			const mock = nock('https://api.github.com');

			mock
				.get('/repos/testowner/testrepo/issues')
				.query({ per_page: 1 })
				.reply(200, [
					{
						url: 'https://api.github.com/repos/testowner/testrepo/issues/1',
						repository_url: 'https://api.github.com/repos/testowner/testrepo',
						labels_url: 'https://api.github.com/repos/testowner/testrepo/issues/1/labels{/name}',
						comments_url: 'https://api.github.com/repos/testowner/testrepo/issues/1/comments',
						events_url: 'https://api.github.com/repos/testowner/testrepo/issues/1/events',
						html_url: 'https://github.com/testowner/testrepo/issues/1',
						id: 1,
						number: 1,
						title: 'Found a bug',
						user: {
							login: 'testuser',
							id: 1,
							node_id: 'MDQ6VXNlcjE=',
							avatar_url: 'https://github.com/images/error/testuser_happy.gif',
							gravatar_id: '',
							url: 'https://api.github.com/users/testuser',
							html_url: 'https://github.com/testuser',
							type: 'User',
							site_admin: false,
						},
						labels: [
							{
								id: 208045946,
								node_id: 'MDU6TGFiZWwyMDgwNDU5NDY=',
								url: 'https://api.github.com/repos/testowner/testrepo/labels/bug',
								name: 'bug',
								description: "Something isn't working",
								color: 'd73a49',
								default: true,
							},
						],
						state: 'open',
						locked: false,
						assignee: null,
						assignees: [],
						milestone: null,
						comments: 0,
						created_at: '2011-04-22T13:33:48Z',
						updated_at: '2011-04-22T13:33:48Z',
						closed_at: null,
						author_association: 'COLLABORATOR',
						active_lock_reason: null,
						body: "I'm having a problem with this.",
						reactions: {
							url: 'https://api.github.com/repos/testowner/testrepo/issues/1/reactions',
							total_count: 0,
							'+1': 0,
							'-1': 0,
							laugh: 0,
							hooray: 0,
							confused: 0,
							heart: 0,
							rocket: 0,
							eyes: 0,
						},
						timeline_url: 'https://api.github.com/repos/testowner/testrepo/issues/1/timeline',
						performed_via_github_app: null,
						state_reason: null,
					},
				]);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['getRepositoryIssuesLimit.workflow.json'],
		});
	});

	describe('Filtered getIssues Operation', () => {
		beforeAll(() => {
			const mock = nock('https://api.github.com');

			mock
				.get('/repos/testowner/testrepo/issues')
				.query({ state: 'closed', labels: 'bug', assignee: 'testuser', per_page: 100, page: 1 })
				.reply(200, [
					{
						url: 'https://api.github.com/repos/testowner/testrepo/issues/3',
						repository_url: 'https://api.github.com/repos/testowner/testrepo',
						labels_url: 'https://api.github.com/repos/testowner/testrepo/issues/3/labels{/name}',
						comments_url: 'https://api.github.com/repos/testowner/testrepo/issues/3/comments',
						events_url: 'https://api.github.com/repos/testowner/testrepo/issues/3/events',
						html_url: 'https://github.com/testowner/testrepo/issues/3',
						id: 3,
						number: 3,
						title: 'Fixed bug',
						user: {
							login: 'testuser',
							id: 1,
							node_id: 'MDQ6VXNlcjE=',
							avatar_url: 'https://github.com/images/error/testuser_happy.gif',
							gravatar_id: '',
							url: 'https://api.github.com/users/testuser',
							html_url: 'https://github.com/testuser',
							type: 'User',
							site_admin: false,
						},
						labels: [
							{
								id: 208045946,
								node_id: 'MDU6TGFiZWwyMDgwNDU5NDY=',
								url: 'https://api.github.com/repos/testowner/testrepo/labels/bug',
								name: 'bug',
								description: "Something isn't working",
								color: 'd73a49',
								default: true,
							},
						],
						state: 'closed',
						locked: false,
						assignee: {
							login: 'testuser',
							id: 1,
							node_id: 'MDQ6VXNlcjE=',
							avatar_url: 'https://github.com/images/error/testuser_happy.gif',
							gravatar_id: '',
							url: 'https://api.github.com/users/testuser',
							html_url: 'https://github.com/testuser',
							type: 'User',
							site_admin: false,
						},
						assignees: [
							{
								login: 'testuser',
								id: 1,
								node_id: 'MDQ6VXNlcjE=',
								avatar_url: 'https://github.com/images/error/testuser_happy.gif',
								gravatar_id: '',
								url: 'https://api.github.com/users/testuser',
								html_url: 'https://github.com/testuser',
								type: 'User',
								site_admin: false,
							},
						],
						milestone: null,
						comments: 2,
						created_at: '2011-04-20T13:33:48Z',
						updated_at: '2011-04-25T13:33:48Z',
						closed_at: '2011-04-25T13:33:48Z',
						author_association: 'COLLABORATOR',
						active_lock_reason: null,
						body: 'This bug has been fixed.',
						reactions: {
							url: 'https://api.github.com/repos/testowner/testrepo/issues/3/reactions',
							total_count: 1,
							'+1': 1,
							'-1': 0,
							laugh: 0,
							hooray: 0,
							confused: 0,
							heart: 0,
							rocket: 0,
							eyes: 0,
						},
						timeline_url: 'https://api.github.com/repos/testowner/testrepo/issues/3/timeline',
						performed_via_github_app: null,
						state_reason: 'completed',
					},
				]);
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['getRepositoryIssuesFiltered.workflow.json'],
		});
	});
});
