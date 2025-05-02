import nock from 'nock';

import { initBinaryDataService, testWorkflows, getWorkflowFilenames } from '@test/nodes/Helpers';

describe('Google GSuiteAdmin Node - Get User', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('get.workflow.json'),
	);

	beforeAll(async () => {
		await initBinaryDataService();
	});

	beforeEach(() => {
		nock.disableNetConnect();

		nock('https://www.googleapis.com/admin')
			.get('/directory/v1/users/112507770188715252026')
			.query({ projection: 'basic' })
			.reply(200, {
				kind: 'admin#directory#user',
				id: '112507770188715252026',
				primaryEmail: 'new@example.com',
				name: {
					givenName: 'New One',
					familyName: 'User',
					fullName: 'New One User',
				},
				isAdmin: false,
				lastLoginTime: '1970-01-01T00:00:00.000Z',
				creationTime: '2024-12-20T20:48:53.000Z',
				suspended: true,
				emails: [
					{
						address: 'new@example.com',
						primary: true,
					},
				],
			});
	});

	testWorkflows(workflows);
});
