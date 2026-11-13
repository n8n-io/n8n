import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('OpenThesaurus > Workflows', () => {
	beforeAll(() => {
		nock('https://www.openthesaurus.de')
			.get('/synonyme/search')
			.query({ q: 'Haus', format: 'application/json' })
			.reply(200, {
				synsets: [{ id: 2433, terms: [{ term: 'Haus' }, { term: 'Gebäude' }] }],
			});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
