import { setup, equalityTest, workflowToTests } from '../../../../test/nodes/Helpers';

import nock from 'nock';

describe('Test HTTP Request Node, GET', () => {
	const workflows = ['nodes/HttpRequest/test/node/workflow.get.json'];
	const tests = workflowToTests(workflows);

	beforeAll(() => {
		nock.disableNetConnect();

		nock('https://dummyjson.com').get('/todos/1').reply(200, {
			id: 1,
			todo: 'Do something nice for someone I care about',
			completed: true,
			userId: 26,
		});

		nock('https://dummyjson.com')
			.matchHeader('Authorization', 'Bearer 12345')
			.get('/todos/3')
			.reply(200, {
				id: 3,
				todo: 'Watch a classic movie',
				completed: false,
				userId: 4,
			});

		nock('https://dummyjson.com')
			.get('/todos?limit=2&skip=10')
			.reply(200, {
				todos: [
					{
						id: 11,
						todo: "Text a friend I haven't talked to in a long time",
						completed: false,
						userId: 39,
					},
					{
						id: 12,
						todo: 'Organize pantry',
						completed: true,
						userId: 39,
					},
				],
				total: 150,
				skip: 10,
				limit: 2,
			});
	});

	afterAll(() => {
		nock.restore();
	});

	const nodeTypes = setup(tests);

	for (const testData of tests) {
		test(testData.description, async () => equalityTest(testData, nodeTypes));
	}
});

describe('Test HTTP Request Node, POST', () => {
	const workflows = ['nodes/HttpRequest/test/node/workflow.post.json'];
	const tests = workflowToTests(workflows);

	beforeAll(() => {
		nock.disableNetConnect();

		nock('https://dummyjson.com')
			.post('/todos/add', {
				todo: 'Use DummyJSON in the project',
				completed: false,
				userId: 5,
			})
			.reply(200, {
				id: 151,
				todo: 'Use DummyJSON in the project',
				completed: false,
				userId: '5',
			});
	});

	afterAll(() => {
		nock.restore();
	});

	const nodeTypes = setup(tests);

	for (const testData of tests) {
		test(testData.description, async () => equalityTest(testData, nodeTypes));
	}
});
