import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

import users from './fixtures/users.json';

describe('Salesforce Node', () => {
	nock.emitter.on('no match', (req) => {
		console.error('Unmatched request: ', req);
	});

	const salesforceNock = nock('https://salesforce.instance');

	describe('users', () => {
		beforeAll(() => {
			salesforceNock
				.get('/services/data/v59.0/query')
				.query({
					q: 'SELECT id,name,email FROM User ',
				})
				.reply(200, { records: users });
		});

		testWorkflows(['nodes/Salesforce/__test__/node/users.workflow.json']);
	});
});
