import nock from 'nock';

import { getWorkflowFilenames, initBinaryDataService, testWorkflows } from '@test/nodes/Helpers';

describe('Test Quoted Response Encoding', () => {
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

	const workflows = getWorkflowFilenames(__dirname);
	testWorkflows(workflows);
});
