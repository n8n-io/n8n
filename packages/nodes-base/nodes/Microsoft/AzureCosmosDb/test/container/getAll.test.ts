import nock from 'nock';

import {
	initBinaryDataService,
	testWorkflows,
	getWorkflowFilenames,
} from '../../../../../test/nodes/Helpers';

describe('Azure Cosmos DB - Get All Containers', () => {
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
			.get('/colls')
			.reply(
				200,
				{
					_rid: '4PVyAA==',
					DocumentCollections: [
						{
							id: 'newOne3',
							indexingPolicy: {
								indexingMode: 'consistent',
								automatic: true,
								includedPaths: [{ path: '/*' }],
								excludedPaths: [{ path: '/"_etag"/?' }],
								fullTextIndexes: [],
							},
							partitionKey: {
								paths: ['/id'],
								kind: 'Hash',
								version: 2,
							},
							conflictResolutionPolicy: {
								mode: 'LastWriterWins',
								conflictResolutionPath: '/_ts',
								conflictResolutionProcedure: '',
							},
							geospatialConfig: { type: 'Geography' },
						},
						{
							id: 'newId',
							indexingPolicy: {
								indexingMode: 'consistent',
								automatic: true,
								includedPaths: [{ path: '/*' }],
								excludedPaths: [{ path: '/"_etag"/?' }],
								fullTextIndexes: [],
							},
							partitionKey: {
								paths: ['/id'],
								kind: 'Hash',
								version: 2,
							},
							uniqueKeyPolicy: {
								uniqueKeys: [],
							},
							conflictResolutionPolicy: {
								mode: 'LastWriterWins',
								conflictResolutionPath: '/_ts',
								conflictResolutionProcedure: '',
							},
							geospatialConfig: { type: 'Geography' },
							fullTextPolicy: {
								defaultLanguage: 'en-US',
								fullTextPaths: [],
							},
							computedProperties: [],
						},
						{
							id: 'ContainerWithNameAsKey',
							indexingPolicy: {
								indexingMode: 'consistent',
								automatic: true,
								includedPaths: [{ path: '/*' }],
								excludedPaths: [{ path: '/"_etag"/?' }],
								fullTextIndexes: [],
							},
							partitionKey: {
								paths: ['/Name'],
								kind: 'Hash',
								version: 2,
							},
							uniqueKeyPolicy: {
								uniqueKeys: [],
							},
							conflictResolutionPolicy: {
								mode: 'LastWriterWins',
								conflictResolutionPath: '/_ts',
								conflictResolutionProcedure: '',
							},
							geospatialConfig: { type: 'Geography' },
							fullTextPolicy: {
								defaultLanguage: 'en-US',
								fullTextPaths: [],
							},
							computedProperties: [],
						},
						{
							id: 'ContainerWithPhoneNrAsKey',
							indexingPolicy: {
								indexingMode: 'consistent',
								automatic: true,
								includedPaths: [{ path: '/*' }],
								excludedPaths: [{ path: '/"_etag"/?' }],
								fullTextIndexes: [],
							},
							partitionKey: {
								paths: ['/PhoneNumber'],
								kind: 'Hash',
								version: 2,
							},
							conflictResolutionPolicy: {
								mode: 'LastWriterWins',
								conflictResolutionPath: '/_ts',
								conflictResolutionProcedure: '',
							},
							geospatialConfig: { type: 'Geography' },
						},
					],
					_count: 4,
				},
				{
					'x-ms-continuation': '4PVyAKoVaBQ=',
				},
			)
			.get('/colls')
			.matchHeader('x-ms-continuation', '4PVyAKoVaBQ=')
			.reply(200, {
				_rid: '4PVyAA==',
				DocumentCollections: [
					{
						id: 'ContainerWithPhoneNrAsKey',
						indexingPolicy: {
							indexingMode: 'consistent',
							automatic: true,
							includedPaths: [{ path: '/*' }],
							excludedPaths: [{ path: '/"_etag"/?' }],
							fullTextIndexes: [],
						},
						partitionKey: {
							paths: ['/PhoneNumber'],
							kind: 'Hash',
							version: 2,
						},
						conflictResolutionPolicy: {
							mode: 'LastWriterWins',
							conflictResolutionPath: '/_ts',
							conflictResolutionProcedure: '',
						},
						geospatialConfig: { type: 'Geography' },
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
