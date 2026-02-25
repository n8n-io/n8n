import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

describe('Azure Cosmos DB - Get All Items', () => {
	beforeEach(() => {
		const { baseUrl } = credentials.microsoftAzureCosmosDbSharedKeyApi;

		nock(baseUrl)
			.persist()
			.defaultReplyHeaders({ 'Content-Type': 'application/json' })
			.get('/colls/newOne3/docs')
			.reply(
				200,
				{
					_rid: '4PVyAMPuBto=',
					Documents: [
						{
							id: 'John',
							FamilyName: 'NewNameAdded',
							Parents: [
								88,
								{ FirstName: 'Thomas', FamilyName: 'Bob' },
								{ FamilyName: null, FirstName: 'Mary Kay' },
							],
							ExtraField: 'nothing serious',
							Otherdetails: 'male',
							This: 'male',
						},
						{
							FamilyName: 'NewName',
							id: 'NewId',
						},
						{
							id: 'this',
						},
					],
					_count: 3,
				},
				{
					'x-ms-continuation': '4PVyAKoVaBQ=',
				},
			)
			.get('/colls/newOne3/docs')
			.matchHeader('x-ms-continuation', '4PVyAKoVaBQ=')
			.reply(200, {
				_rid: '4PVyAMPuBto=',
				Documents: [
					{
						id: 'John',
						FamilyName: 'NewNameAdded',
						Parents: [
							88,
							{ FirstName: 'Thomas', FamilyName: 'Bob' },
							{ FamilyName: null, FirstName: 'Mary Kay' },
						],
						ExtraField: 'nothing serious',
						Otherdetails: 'male',
						This: 'male',
					},
				],
				_count: 1,
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['getAll.workflow.json'],
	});
});
