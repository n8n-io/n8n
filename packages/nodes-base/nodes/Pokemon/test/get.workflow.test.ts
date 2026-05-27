import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { PIKACHU_DETAIL } from './apiResponses';

describe('Pokemon Node — Get Workflow', () => {
	describe('Run Test Workflow', () => {
		beforeAll(() => {
			nock('https://pokeapi.co').get('/api/v2/pokemon/pikachu').reply(200, PIKACHU_DETAIL);
		});

		new NodeTestHarness().setupTests();
	});
});
