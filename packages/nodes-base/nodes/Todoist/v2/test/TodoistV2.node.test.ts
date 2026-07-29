import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';
import nock from 'nock';

// Mock data with randomized IDs and generic names
const projectData = {
	id: '1234567890',
	parent_id: null,
	order: 31,
	color: 'charcoal',
	name: 'Sample Project',
	comment_count: 0,
	is_shared: false,
	is_favorite: false,
	is_inbox_project: false,
	is_team_inbox: false,
	url: 'https://app.todoist.com/app/project/abc123def456',
	view_style: 'list',
	description: '',
};

const sectionData = {
	id: '987654321',
	v2_id: 'sec123abc456',
	project_id: '1234567890',
	v2_project_id: 'abc123def456',
	order: 0,
	name: 'Sample Section',
};

const taskData = {
	id: '5555666677',
	assigner_id: null,
	assignee_id: null,
	project_id: '1234567890',
	section_id: null,
	parent_id: null,
	order: 1,
	content: 'Sample task content',
	description: 'Sample task description',
	is_completed: false,
	labels: [],
	priority: 1,
	comment_count: 0,
	creator_id: '9876543',
	created_at: '2025-08-03T12:55:25.534632Z',
	due: {
		date: '2025-08-30',
		string: 'Next monday',
		lang: 'en',
		is_recurring: false,
		datetime: '2025-08-30T00:00:00',
	},
	url: 'https://app.todoist.com/app/task/5555666677',
	duration: null,
	deadline: null,
};

const taskData2 = {
	id: '8888999900',
	assigner_id: null,
	assignee_id: null,
	project_id: '1234567890',
	section_id: null,
	parent_id: null,
	order: 3,
	content: 'Another sample task',
	description: '',
	is_completed: false,
	labels: [],
	priority: 1,
	comment_count: 0,
	creator_id: '9876543',
	created_at: '2025-08-03T12:55:31.855475Z',
	due: {
		date: '2029-03-03',
		string: '2029-03-03',
		lang: 'en',
		is_recurring: false,
	},
	url: 'https://app.todoist.com/app/task/8888999900',
	duration: {
		amount: 100,
		unit: 'minute',
	},
	deadline: {
		date: '2025-03-05',
		lang: 'en',
	},
};

const labelData = {
	id: '1111222233',
	name: 'sample-label',
	color: 'red',
	order: 1,
	is_favorite: true,
};

const commentData = {
	id: '4444555566',
	task_id: '5555666677',
	project_id: null,
	content: 'Sample comment',
	posted_at: '2025-08-03T12:55:30.205676Z',
	posted_by_id: '9876543',
	updated_at: '2025-08-03T12:55:30.187423Z',
	attachment: null,
	upload_id: null,
	reactions: {},
	uids_to_notify: [],
};

const collaboratorData = {
	id: '9876543',
	name: 'Sample User',
	email: 'sample@example.com',
};

const quickAddTaskData = {
	added_at: '2025-08-03T12:55:24.953387Z',
	added_by_uid: '9876543',
	assigned_by_uid: null,
	checked: false,
	child_order: 393,
	collapsed: false,
	completed_at: null,
	content: 'Sample quick task',
	day_order: -1,
	deadline: null,
	description: '',
	due: null,
	duration: null,
	id: '7777888899',
	is_deleted: false,
	labels: [],
	note_count: 0,
	parent_id: null,
	priority: 1,
	project_id: '1111111111',
	responsible_uid: null,
	section_id: null,
	sync_id: null,
	updated_at: '2025-08-03T12:55:24.953399Z',
	user_id: '9876543',
	v2_id: 'quick123abc',
	v2_parent_id: null,
	v2_project_id: 'inbox123abc',
	v2_section_id: null,
};

const projectsListData = [
	{
		id: '1111111111',
		parent_id: null,
		order: 0,
		color: 'grey',
		name: 'Inbox',
		comment_count: 0,
		is_shared: false,
		is_favorite: false,
		is_inbox_project: true,
		is_team_inbox: false,
		url: 'https://app.todoist.com/app/project/inbox123abc',
		view_style: 'list',
		description: '',
	},
	{
		id: '2222222222',
		parent_id: null,
		order: 1,
		color: 'blue',
		name: 'Work Projects',
		comment_count: 0,
		is_shared: false,
		is_favorite: true,
		is_inbox_project: false,
		is_team_inbox: false,
		url: 'https://app.todoist.com/app/project/work123abc',
		view_style: 'board',
		description: '',
	},
];

const tasksListData = [
	{
		id: '3333444455',
		assigner_id: null,
		assignee_id: null,
		project_id: '1111111111',
		section_id: '987654321',
		parent_id: null,
		order: -13,
		content: 'Sample task 1',
		description: '',
		is_completed: false,
		labels: ['work'],
		priority: 1,
		comment_count: 0,
		creator_id: '9876543',
		created_at: '2025-06-25T18:52:23.989765Z',
		due: null,
		url: 'https://app.todoist.com/app/task/3333444455',
		duration: null,
		deadline: null,
	},
	{
		id: '6666777788',
		assigner_id: null,
		assignee_id: null,
		project_id: '1111111111',
		section_id: '987654321',
		parent_id: null,
		order: -12,
		content: 'Sample task 2',
		description: '',
		is_completed: false,
		labels: ['personal'],
		priority: 1,
		comment_count: 0,
		creator_id: '9876543',
		created_at: '2025-06-22T09:58:35.471124Z',
		due: null,
		url: 'https://app.todoist.com/app/task/6666777788',
		duration: null,
		deadline: null,
	},
];

const labelsListData = [
	{
		id: '1111222233',
		name: 'work',
		color: 'blue',
		order: 1,
		is_favorite: true,
	},
	{
		id: '4444555566',
		name: 'personal',
		color: 'green',
		order: 2,
		is_favorite: false,
	},
];

const successResponse = { success: true };

describe('Execute TodoistV2 Node', () => {
	const testHarness = new NodeTestHarness();

	beforeEach(() => {
		const todoistNock = nock('https://api.todoist.com');

		// Project operations
		todoistNock.post('/rest/v2/projects').reply(200, projectData);
		todoistNock.get('/rest/v2/projects/1234567890').reply(200, projectData);
		todoistNock.post('/rest/v2/projects/1234567890/archive').reply(200, successResponse);
		todoistNock.post('/rest/v2/projects/1234567890/unarchive').reply(200, successResponse);
		todoistNock.post('/rest/v2/projects/1234567890').reply(200, successResponse);
		todoistNock.get('/rest/v2/projects/1234567890/collaborators').reply(200, [collaboratorData]);
		todoistNock.delete('/rest/v2/projects/1234567890').reply(200, successResponse);
		todoistNock.get('/rest/v2/projects').reply(200, projectsListData);

		// Section operations
		todoistNock.post('/rest/v2/sections').reply(200, sectionData);
		todoistNock.get('/rest/v2/sections/987654321').reply(200, sectionData);
		todoistNock.post('/rest/v2/sections/987654321').reply(200, successResponse);
		todoistNock.delete('/rest/v2/sections/987654321').reply(200, successResponse);
		todoistNock
			.get('/rest/v2/sections')
			.query({ project_id: '1234567890' })
			.reply(200, [sectionData]);

		// Task operations
		todoistNock.post('/rest/v2/tasks').reply(200, taskData);
		todoistNock.post('/rest/v2/tasks').reply(200, taskData2);
		todoistNock.post('/rest/v2/tasks/8888999900').reply(200, successResponse);
		todoistNock.post('/rest/v2/tasks/8888999900/close').reply(200, successResponse);
		todoistNock.post('/rest/v2/tasks/8888999900/reopen').reply(200, successResponse);
		todoistNock.delete('/rest/v2/tasks/8888999900').reply(200, successResponse);
		todoistNock.get('/rest/v2/tasks').query(true).reply(200, tasksListData);

		// Move task uses sync API
		todoistNock.post('/sync/v9/sync').reply(200, { sync_status: { '8888999900': 'ok' } });

		// Label operations
		todoistNock.post('/rest/v2/labels').reply(200, labelData);
		todoistNock.get('/rest/v2/labels/1111222233').reply(200, labelData);
		todoistNock.post('/rest/v2/labels/1111222233').reply(200, successResponse);
		todoistNock.delete('/rest/v2/labels/1111222233').reply(200, successResponse);
		todoistNock.get('/rest/v2/labels').reply(200, labelsListData);

		// Comment operations
		todoistNock.post('/rest/v2/comments').reply(200, commentData);
		todoistNock.get('/rest/v2/comments/4444555566').reply(200, commentData);
		todoistNock.post('/rest/v2/comments/4444555566').reply(200, successResponse);
		todoistNock.get('/rest/v2/comments').query({ task_id: '5555666677' }).reply(200, [commentData]);

		// Quick add operation
		todoistNock.post('/sync/v9/quick/add').reply(200, quickAddTaskData);
	});

	afterEach(() => {
		nock.cleanAll();
	});

	const testData: WorkflowTestData = {
		description: 'Execute operations',
		input: {
			workflowData: testHarness.readWorkflowJSON('workflow.json'),
		},
		output: {
			nodeData: {
				'Create a project1': [[{ json: projectData }]],
				'Get a project': [[{ json: projectData }]],
				'Archive a project': [[{ json: successResponse }]],
				'Unarchive a project': [[{ json: successResponse }]],
				'Update a project': [[{ json: successResponse }]],
				'Get project collaborators': [[{ json: collaboratorData }]],
				'Delete a project': [[{ json: successResponse }]],
				'Get many projects': [projectsListData.map((project) => ({ json: project }))],
				'Create a section': [[{ json: sectionData }]],
				'Get a section': [[{ json: sectionData }]],
				'Update a section': [[{ json: successResponse }]],
				'Delete a section': [[{ json: successResponse }]],
				'Get many sections': [[{ json: sectionData }]],
				'Create a task': [[{ json: taskData }]],
				'Create a task1': [[{ json: taskData2 }]],
				'Update a task': [[{ json: successResponse }]],
				'Move a task': [[{ json: successResponse }]],
				'Close a task': [[{ json: successResponse }]],
				'Reopen a task': [[{ json: successResponse }]],
				'Delete a task': [[{ json: successResponse }]],
				'Get many tasks': [tasksListData.map((task) => ({ json: task }))],
				'Create a label': [[{ json: labelData }]],
				'Get a label': [[{ json: labelData }]],
				'Update a label': [[{ json: successResponse }]],
				'Delete a label': [[{ json: successResponse }]],
				'Get many labels': [labelsListData.map((label) => ({ json: label }))],
				'Create a comment': [[{ json: commentData }]],
				'Get a comment': [[{ json: commentData }]],
				'Update a comment': [[{ json: successResponse }]],
				'Get many comments': [[{ json: commentData }]],
				'Quick add a task': [[{ json: quickAddTaskData }]],
			},
		},
	};

	testHarness.setupTest(testData, { credentials: { todoistApi: {} } });
});
