import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { MicrosoftSharePoint } from '../../MicrosoftSharePoint.node';
import { credentials } from '../credentials';

describe('Microsoft SharePoint Node', () => {
	describe('List search', () => {
		let loadOptionsFunctions: MockProxy<ILoadOptionsFunctions>;
		let mockRequestWithAuthentication: jest.Mock;
		let node: MicrosoftSharePoint;

		beforeEach(() => {
			loadOptionsFunctions = mock<ILoadOptionsFunctions>();
			mockRequestWithAuthentication = jest.fn();
			loadOptionsFunctions.helpers.httpRequestWithAuthentication = mockRequestWithAuthentication;
			loadOptionsFunctions.getCredentials.mockResolvedValue(
				credentials.microsoftSharePointOAuth2Api,
			);
			node = new MicrosoftSharePoint();
		});

		afterEach(() => {
			jest.resetAllMocks();
		});

		it('should list search files', async () => {
			const mockResponse = {
				'@odata.nextLink':
					'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/items?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
				value: [
					{
						'@odata.etag': '"{70EC0A2F-6C3E-425F-BBE2-1D4E758F90EE},1"',
						id: '01SPEVVYBPBLWHAPTML5BLXYQ5JZ2Y7EHO',
						name: 'Folder1',
					},
					{
						'@odata.etag': '"{10F06786-5AAF-434A-8A4E-3ED44DE4A987},6"',
						id: '01SPEVVYEGM7YBBL22JJBYUTR62RG6JKMH',
						name: 'file2.jpg',
						file: {
							hashes: {
								quickXorHash: 'uFgaWYgAVo55sg4DIR9BTMzlmH8=',
							},
							irmEffectivelyEnabled: false,
							irmEnabled: false,
							mimeType: 'image/jpeg',
						},
					},
					{
						'@odata.etag': '"{0EC452E0-D0F7-4ECF-87D7-B738F865313B},1"',
						id: '01SPEVVYHAKLCA556QZ5HIPV5XHD4GKMJ3',
						name: 'file1.txt',
						file: {
							hashes: {
								quickXorHash: 'AAAAAAAAAAAAAAAAAAAAAAAAAAA=',
							},
							irmEffectivelyEnabled: false,
							irmEnabled: false,
							mimeType: 'text/plain',
						},
					},
				],
			};
			mockRequestWithAuthentication.mockReturnValue(mockResponse);
			loadOptionsFunctions.getNodeParameter.mockReturnValueOnce('site');
			loadOptionsFunctions.getNodeParameter.mockReturnValueOnce('folder');

			const listSearchResult = await node.methods.listSearch.getFiles.call(
				loadOptionsFunctions,
				'file',
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(1);
			expect(mockRequestWithAuthentication.mock.calls[0][1]).toMatchObject({
				qs: {
					$filter: "name eq 'file'",
				},
			});
			expect(listSearchResult).toEqual({
				results: [
					{ name: 'file1.txt', value: '01SPEVVYHAKLCA556QZ5HIPV5XHD4GKMJ3' },
					{ name: 'file2.jpg', value: '01SPEVVYEGM7YBBL22JJBYUTR62RG6JKMH' },
				],
				paginationToken:
					'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/items?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
			});
		});

		it('should list search files with pagination', async () => {
			const mockResponse = {
				value: [
					{
						'@odata.etag': '"{0EC452E0-D0F7-4ECF-87D7-B738F865313B},1"',
						id: '01SPEVVYHAKLCA556QZ5HIPV5XHD4GKMJ3',
						name: 'file1.txt',
						file: {
							hashes: {
								quickXorHash: 'AAAAAAAAAAAAAAAAAAAAAAAAAAA=',
							},
							irmEffectivelyEnabled: false,
							irmEnabled: false,
							mimeType: 'text/plain',
						},
					},
				],
			};
			mockRequestWithAuthentication.mockReturnValue(mockResponse);
			loadOptionsFunctions.getNodeParameter.mockReturnValueOnce('site');
			loadOptionsFunctions.getNodeParameter.mockReturnValueOnce('folder');

			const listSearchResult = await node.methods.listSearch.getFiles.call(
				loadOptionsFunctions,
				undefined,
				'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/items?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(1);
			expect(mockRequestWithAuthentication.mock.calls[0][1]).toMatchObject({
				url: 'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/items?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
			});
			expect(listSearchResult).toEqual({
				results: [{ name: 'file1.txt', value: '01SPEVVYHAKLCA556QZ5HIPV5XHD4GKMJ3' }],
			});
		});

		it('should list search folders', async () => {
			const mockResponse = {
				'@odata.nextLink':
					'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/items?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
				value: [
					{
						'@odata.etag': '"{529A466D-D708-4857-B771-24F467546A2A},1"',
						id: '01SPEVVYDNI2NFECGXK5ELO4JE6RTVI2RK',
						name: 'Folder2',
						folder: {
							childCount: 1,
							view: {},
						},
					},
					{
						'@odata.etag': '"{A3B2AE2A-2099-4194-A38B-EC7182CA3000},1"',
						id: '01SPEVVYBKV2ZKHGJASRA2HC7MOGBMUMAA',
						name: 'Folder1',
						folder: {
							childCount: 7,
							view: {},
						},
					},
					{
						'@odata.etag': '"{A6EF0C5E-0248-482A-AD79-0EFDB6622473},1"',
						id: '01SPEVVYC6BTX2MSACFJEK26IO7W3GEJDT',
						name: 'file.txt',
					},
				],
			};
			mockRequestWithAuthentication.mockReturnValue(mockResponse);
			loadOptionsFunctions.getNodeParameter.mockReturnValueOnce('site');

			const listSearchResult = await node.methods.listSearch.getFolders.call(
				loadOptionsFunctions,
				'folder',
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(1);
			expect(mockRequestWithAuthentication.mock.calls[0][1]).toMatchObject({
				qs: {
					$filter: "name eq 'folder'",
				},
			});
			expect(listSearchResult).toEqual({
				results: [
					{
						name: 'Folder1',
						value: '01SPEVVYBKV2ZKHGJASRA2HC7MOGBMUMAA',
					},
					{
						name: 'Folder2',
						value: '01SPEVVYDNI2NFECGXK5ELO4JE6RTVI2RK',
					},
				],
				paginationToken:
					'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/items?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
			});
		});

		it('should list search folders with pagination', async () => {
			const mockResponse = {
				value: [
					{
						'@odata.etag': '"{A3B2AE2A-2099-4194-A38B-EC7182CA3000},1"',
						id: '01SPEVVYBKV2ZKHGJASRA2HC7MOGBMUMAA',
						name: 'Folder1',
						folder: {
							childCount: 7,
							view: {},
						},
					},
				],
			};
			mockRequestWithAuthentication.mockReturnValue(mockResponse);
			loadOptionsFunctions.getNodeParameter.mockReturnValueOnce('site');

			const listSearchResult = await node.methods.listSearch.getFolders.call(
				loadOptionsFunctions,
				undefined,
				'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/items?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(1);
			expect(mockRequestWithAuthentication.mock.calls[0][1]).toMatchObject({
				url: 'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/items?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
			});
			expect(listSearchResult).toEqual({
				results: [
					{
						name: 'Folder1',
						value: '01SPEVVYBKV2ZKHGJASRA2HC7MOGBMUMAA',
					},
				],
			});
		});

		it('should list search items', async () => {
			const mockResponse = {
				'@odata.nextLink':
					'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/listItems?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
				value: [
					{
						'@odata.etag': '"98af0386-66bd-4524-a653-80be05e0f14d,2"',
						id: '2',
						'fields@odata.navigationLink': 'fields',
						fields: {
							'@odata.etag': '"98af0386-66bd-4524-a653-80be05e0f14d,2"',
							Title: 'Title 2',
						},
					},
					{
						'@odata.etag': '"0ea4148a-f8e5-4f2f-a815-2e2be693b164,4"',
						id: '1',
						'fields@odata.navigationLink': 'fields',
						fields: {
							'@odata.etag': '"0ea4148a-f8e5-4f2f-a815-2e2be693b164,4"',
							Title: 'Title 1',
						},
					},
				],
			};
			mockRequestWithAuthentication.mockReturnValue(mockResponse);
			loadOptionsFunctions.getNodeParameter.mockReturnValueOnce('site');
			loadOptionsFunctions.getNodeParameter.mockReturnValueOnce('list');

			const listSearchResult = await node.methods.listSearch.getItems.call(
				loadOptionsFunctions,
				'Title',
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(1);
			expect(mockRequestWithAuthentication.mock.calls[0][1]).toMatchObject({
				qs: {
					$filter: "fields/Title eq 'Title'",
				},
			});
			expect(listSearchResult).toEqual({
				results: [
					{
						name: 'Title 1',
						value: '1',
					},
					{
						name: 'Title 2',
						value: '2',
					},
				],
				paginationToken:
					'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/listItems?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
			});
		});

		it('should list search items with pagination', async () => {
			const mockResponse = {
				value: [
					{
						'@odata.etag': '"0ea4148a-f8e5-4f2f-a815-2e2be693b164,4"',
						id: '1',
						'fields@odata.navigationLink': 'fields',
						fields: {
							'@odata.etag': '"0ea4148a-f8e5-4f2f-a815-2e2be693b164,4"',
						},
					},
				],
			};
			mockRequestWithAuthentication.mockReturnValue(mockResponse);
			loadOptionsFunctions.getNodeParameter.mockReturnValueOnce('site');
			loadOptionsFunctions.getNodeParameter.mockReturnValueOnce('list');

			const listSearchResult = await node.methods.listSearch.getItems.call(
				loadOptionsFunctions,
				undefined,
				'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/listItems?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(1);
			expect(mockRequestWithAuthentication.mock.calls[0][1]).toMatchObject({
				url: 'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/listItems?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
			});
			expect(listSearchResult).toEqual({
				results: [
					{
						name: '1',
						value: '1',
					},
				],
			});
		});

		it('should list search lists', async () => {
			const mockResponse = {
				'@odata.nextLink':
					'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/lists?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
				value: [
					{
						'@odata.etag': '"58a279af-1f06-4392-a5ed-2b37fa1d6c1d,5"',
						id: '58a279af-1f06-4392-a5ed-2b37fa1d6c1d',
						displayName: 'List 2',
					},
					{
						'@odata.etag': '"23af565a-da89-48f0-ae5f-2d4a7244b446,0"',
						id: '23af565a-da89-48f0-ae5f-2d4a7244b446',
						displayName: 'List 1',
					},
				],
			};
			mockRequestWithAuthentication.mockReturnValue(mockResponse);
			loadOptionsFunctions.getNodeParameter.mockReturnValueOnce('site');

			const listSearchResult = await node.methods.listSearch.getLists.call(
				loadOptionsFunctions,
				'List',
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(1);
			expect(mockRequestWithAuthentication.mock.calls[0][1]).toMatchObject({
				qs: {
					$filter: "displayName eq 'List'",
				},
			});
			expect(listSearchResult).toEqual({
				results: [
					{
						name: 'List 1',
						value: '23af565a-da89-48f0-ae5f-2d4a7244b446',
					},
					{
						name: 'List 2',
						value: '58a279af-1f06-4392-a5ed-2b37fa1d6c1d',
					},
				],
				paginationToken:
					'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/lists?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
			});
		});

		it('should list search lists with pagination', async () => {
			const mockResponse = {
				value: [
					{
						'@odata.etag': '"23af565a-da89-48f0-ae5f-2d4a7244b446,0"',
						id: '23af565a-da89-48f0-ae5f-2d4a7244b446',
						displayName: 'List 1',
					},
				],
			};
			mockRequestWithAuthentication.mockReturnValue(mockResponse);
			loadOptionsFunctions.getNodeParameter.mockReturnValueOnce('site');

			const listSearchResult = await node.methods.listSearch.getLists.call(
				loadOptionsFunctions,
				undefined,
				'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/lists?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(1);
			expect(mockRequestWithAuthentication.mock.calls[0][1]).toMatchObject({
				url: 'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/lists?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
			});
			expect(listSearchResult).toEqual({
				results: [
					{
						name: 'List 1',
						value: '23af565a-da89-48f0-ae5f-2d4a7244b446',
					},
				],
			});
		});

		it('should list search sites', async () => {
			const mockResponse = {
				'@odata.nextLink':
					'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/sites?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
				value: [
					{
						id: 'mydomain.sharepoint.com,cf38a104-c767-48c7-93d0-c093e3909c78,3abe66fd-ec23-469f-abc6-332e3a95bf75',
						title: 'Site 2',
					},
					{
						id: 'mydomain.sharepoint.com,3286a459-bc45-4aab-8200-b9ba7edcca96,3abe66fd-ec23-469f-abc6-332e3a95bf75',
						title: 'Site 1',
					},
				],
			};
			mockRequestWithAuthentication.mockReturnValue(mockResponse);

			const listSearchResult = await node.methods.listSearch.getSites.call(
				loadOptionsFunctions,
				'Site',
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(1);
			expect(mockRequestWithAuthentication.mock.calls[0][1]).toMatchObject({
				qs: {
					$search: 'Site',
				},
			});
			expect(listSearchResult).toEqual({
				results: [
					{
						name: 'Site 1',
						value:
							'mydomain.sharepoint.com,3286a459-bc45-4aab-8200-b9ba7edcca96,3abe66fd-ec23-469f-abc6-332e3a95bf75',
					},
					{
						name: 'Site 2',
						value:
							'mydomain.sharepoint.com,cf38a104-c767-48c7-93d0-c093e3909c78,3abe66fd-ec23-469f-abc6-332e3a95bf75',
					},
				],
				paginationToken:
					'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/sites?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
			});
		});

		it('should list search sites and pagination', async () => {
			const mockResponse = {
				value: [
					{
						id: 'mydomain.sharepoint.com,3286a459-bc45-4aab-8200-b9ba7edcca96,3abe66fd-ec23-469f-abc6-332e3a95bf75',
						title: 'Site 1',
					},
				],
			};
			mockRequestWithAuthentication.mockReturnValue(mockResponse);

			const listSearchResult = await node.methods.listSearch.getSites.call(
				loadOptionsFunctions,
				undefined,
				'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/sites?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
			);

			expect(mockRequestWithAuthentication).toHaveBeenCalledTimes(1);
			expect(mockRequestWithAuthentication.mock.calls[0][1]).toMatchObject({
				url: 'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/sites?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
			});
			expect(listSearchResult).toEqual({
				results: [
					{
						name: 'Site 1',
						value:
							'mydomain.sharepoint.com,3286a459-bc45-4aab-8200-b9ba7edcca96,3abe66fd-ec23-469f-abc6-332e3a95bf75',
					},
				],
			});
		});
	});
});
