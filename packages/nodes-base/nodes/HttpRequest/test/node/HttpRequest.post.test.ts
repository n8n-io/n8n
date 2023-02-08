import { setup, equalityTest, workflowToTests } from '../../../../test/nodes/Helpers';

import nock from 'nock';

describe('Test HTTP Request Node, POST', () => {
	const workflows = ['nodes/HttpRequest/test/node/workflow.post.json'];
	const tests = workflowToTests(workflows);

	beforeAll(() => {
		nock.disableNetConnect();

		nock('https://dummyjson.com')
			.post('/todos/add', {
				todo: 'Use DummyJSON in the project',
				completed: false,
				userId: '5',
			})
			.reply(200, {
				id: 151,
				todo: 'Use DummyJSON in the project',
				completed: false,
				userId: '5',
			});
		nock('https://dummyjson.com')
			.post('/todos/add2', {
				todo: 'Use DummyJSON in the project',
				completed: false,
				userId: 15,
			})
			.reply(200, {
				id: 151,
				todo: 'Use DummyJSON in the project',
				completed: false,
				userId: 15,
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
