import { setup, equalityTest, workflowToTests } from '../../../../test/nodes/Helpers';

import nock from 'nock';

describe('Test HTTP Request Node, PUT', () => {
	const workflows = ['nodes/HttpRequest/test/node/workflow.put.json'];
	const tests = workflowToTests(workflows);

	beforeAll(() => {
		nock.disableNetConnect();

		nock('https://dummyjson.com').put('/todos/10', { userId: '42' }).reply(200, {
			id: 10,
			todo: 'Have a football scrimmage with some friends',
			completed: false,
			userId: '42',
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
