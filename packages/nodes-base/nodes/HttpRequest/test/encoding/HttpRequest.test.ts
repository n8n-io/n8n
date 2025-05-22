import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test Response Encoding', () => {
	const baseUrl = 'https://dummy.domain';
	const payload = Buffer.from(
		'El rápido zorro marrón salta sobre el perro perezoso. ¡Qué bello día en París! Árbol, cañón, façade.',
		'latin1',
	);

	beforeAll(async () => {
		nock(baseUrl)
			.persist()
			.get('/index.html')
			.reply(200, payload, { 'content-type': 'text/plain; charset=latin1' });
	});

	new NodeTestHarness().setupTests();
});
