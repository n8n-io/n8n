import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

describe('Azure Cosmos DB - Get All Containers', () => {
	beforeEach(() => {
		const { baseUrl } = credentials.microsoftAzureCosmosDbSharedKeyApi;

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

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['getAll.workflow.json'],
	});
});
