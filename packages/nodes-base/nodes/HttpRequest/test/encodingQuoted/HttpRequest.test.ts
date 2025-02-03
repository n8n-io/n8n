import nock from 'nock';

import {
	setup,
	equalityTest,
	workflowToTests,
	getWorkflowFilenames,
	initBinaryDataService,
} from '@test/nodes/Helpers';

describe('Test Quoted Response Encoding', () => {
	const workflows = getWorkflowFilenames(__dirname);
	const tests = workflowToTests(workflows);

	const baseUrl = 'https://dummy.domain';
	const payload = Buffer.from(
		'El rápido zorro marrón salta sobre el perro perezoso. ¡Qué bello día en París! Árbol, cañón, façade.',
		'latin1',
	);

	beforeAll(async () => {
		await initBinaryDataService();

		nock(baseUrl)
			.persist()
			.get('/index.html')
			.reply(200, payload, { 'content-type': 'text/plain; charset="latin1"' });
	});
	const nodeTypes = setup(tests);

	for (const testData of tests) {
		test(testData.description, async () => await equalityTest(testData, nodeTypes));
	}
});
