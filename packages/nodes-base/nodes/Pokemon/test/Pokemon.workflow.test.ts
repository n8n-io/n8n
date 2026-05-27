import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Pokemon Node — Workflow: Get Many', () => {
	beforeAll(() => {
		nock('https://pokeapi.co')
			.get('/api/v2/pokemon')
			.query({ limit: '3', offset: '0' })
			.reply(200, {
				count: 1302,
				next: 'https://pokeapi.co/api/v2/pokemon?offset=3&limit=3',
				previous: null,
				results: [
					{ name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
					{ name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
					{ name: 'venusaur', url: 'https://pokeapi.co/api/v2/pokemon/3/' },
				],
			});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['getMany.workflow.json'],
	});
});
