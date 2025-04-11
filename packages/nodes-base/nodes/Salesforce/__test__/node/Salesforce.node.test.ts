import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

import userDeltails from './fixtures/user-details.json';
import users from './fixtures/users.json';

describe('Salesforce Node', () => {
	nock.emitter.on('no match', (req) => {
		console.error('Unmatched request: ', req);
	});

	const salesforceNock = nock('https://salesforce.instance/services/data/v59.0');

	describe('users', () => {
		beforeAll(() => {
			salesforceNock
				.get('/query')
				.query({
					q: 'SELECT id,name,email FROM User ',
				})
				.reply(200, { records: users })
				.get('/sobjects/user/id1')
				.reply(200, userDeltails);
		});

		testWorkflows(['nodes/Salesforce/__test__/node/users.workflow.json']);
	});
});
