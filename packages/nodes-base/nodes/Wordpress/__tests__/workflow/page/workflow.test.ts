import nock from 'nock';

import {
	setup,
	equalityTest,
	workflowToTests,
	getWorkflowFilenames,
} from '../../../../../test/nodes/Helpers';
import { empty } from '../apiResponses';

describe('Wordpress > Post Workflows', () => {
	describe('Run workflow', () => {
		const workflows = getWorkflowFilenames(__dirname);
		const tests = workflowToTests(workflows);

		beforeAll(() => {
			const mock = nock('https://myblog.com');
		});

		const nodeTypes = setup(tests);

		for (const testData of tests) {
			test(testData.description, async () => await equalityTest(testData, nodeTypes));
		}
	});
});

describe('Wordpress > Page Workflows', () => {
	describe('Run workflow', () => {
		const workflows = getWorkflowFilenames(__dirname);
		const tests = workflowToTests(workflows);

		beforeAll(() => {
			const mock = nock('https://myblog.com');
		});

		const nodeTypes = setup(tests);

		for (const testData of tests) {
			test(testData.description, async () => await equalityTest(testData, nodeTypes));
		}
	});
});
