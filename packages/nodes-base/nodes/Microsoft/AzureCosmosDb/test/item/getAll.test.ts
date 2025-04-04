import nock from 'nock';

import {
	initBinaryDataService,
	testWorkflows,
	getWorkflowFilenames,
} from '../../../../../test/nodes/Helpers';

describe('Azure Cosmos DB - Get All Items', () => {
	const workflows = getWorkflowFilenames(__dirname).filter((filename) =>
		filename.includes('getAll.workflow.json'),
	);

	beforeAll(async () => {
		await initBinaryDataService();
	});

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}

		const baseUrl = 'https://n8n-us-east-account.documents.azure.com/dbs/database_1';

		nock.cleanAll();
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

	afterEach(() => {
		nock.cleanAll();
	});

	testWorkflows(workflows);
});
