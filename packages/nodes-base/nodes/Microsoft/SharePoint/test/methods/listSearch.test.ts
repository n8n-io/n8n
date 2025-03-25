/* eslint-disable n8n-local-rules/no-plain-errors */
/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import type { ILoadOptionsFunctions, INodeParameterResourceLocator } from 'n8n-workflow';

import { FAKE_CREDENTIALS_DATA } from '@test/nodes/FakeCredentialsMap';

import { MicrosoftSharePoint } from '../../MicrosoftSharePoint.node';

describe('Microsoft SharePoint Node', () => {
	describe('List search', () => {
		it('should list search files', async () => {
			const mockResponse = {
				'@odata.nextLink':
					'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/items?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
				value: [
					{
						'@odata.etag': '"{70EC0A2F-6C3E-425F-BBE2-1D4E758F90EE},1"',
						id: '01SPEVVYBPBLWHAPTML5BLXYQ5JZ2Y7EHO',
						name: 'folder1',
					},
					{
						'@odata.etag': '"{10F06786-5AAF-434A-8A4E-3ED44DE4A987},6"',
						id: '01SPEVVYEGM7YBBL22JJBYUTR62RG6JKMH',
						name: 'image1.jpg',
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
			const mockRequestWithAuthentication = jest.fn().mockReturnValue(mockResponse);
			const mockGetNodeParameter = jest.fn((parameterName, _fallbackValue, _options) => {
				if (parameterName === 'site') {
					return {
						value: 'site1',
					} as INodeParameterResourceLocator;
				}
				if (parameterName === 'folder') {
					return {
						value: 'folder1',
					} as INodeParameterResourceLocator;
				}
				throw new Error('Unknown parameter');
			});
			const mockGetCredentials = jest.fn(async (type: string, _itemIndex?: number) => {
				if (type === 'microsoftSharePointOAuth2Api') {
					return FAKE_CREDENTIALS_DATA.microsoftSharePointOAuth2Api;
				}
				throw new Error('Unknown credentials');
			});
			const mockContext = {
				getCredentials: mockGetCredentials,
				getNodeParameter: mockGetNodeParameter,
				helpers: {
					requestWithAuthentication: mockRequestWithAuthentication,
				},
			} as unknown as ILoadOptionsFunctions;
			const node = new MicrosoftSharePoint();

			const listSearchResult = await node.methods.listSearch.getFiles.call(mockContext);

			expect(listSearchResult).toEqual({
				results: [
					{ name: 'file1.txt', value: '01SPEVVYHAKLCA556QZ5HIPV5XHD4GKMJ3' },
					{ name: 'image1.jpg', value: '01SPEVVYEGM7YBBL22JJBYUTR62RG6JKMH' },
				],
				paginationToken:
					'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/items?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
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
						name: 'folder2',
						folder: {
							childCount: 1,
							view: {},
						},
					},
					{
						'@odata.etag': '"{A3B2AE2A-2099-4194-A38B-EC7182CA3000},1"',
						id: '01SPEVVYBKV2ZKHGJASRA2HC7MOGBMUMAA',
						name: 'folder1',
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
			const mockRequestWithAuthentication = jest.fn().mockReturnValue(mockResponse);
			const mockGetNodeParameter = jest.fn((parameterName, _fallbackValue, _options) => {
				if (parameterName === 'site') {
					return {
						value: 'site1',
					} as INodeParameterResourceLocator;
				}
				throw new Error('Unknown parameter');
			});
			const mockGetCredentials = jest.fn(async (type: string, _itemIndex?: number) => {
				if (type === 'microsoftSharePointOAuth2Api') {
					return FAKE_CREDENTIALS_DATA.microsoftSharePointOAuth2Api;
				}
				throw new Error('Unknown credentials');
			});
			const mockContext = {
				getCredentials: mockGetCredentials,
				getNodeParameter: mockGetNodeParameter,
				helpers: {
					requestWithAuthentication: mockRequestWithAuthentication,
				},
			} as unknown as ILoadOptionsFunctions;
			const node = new MicrosoftSharePoint();

			const listSearchResult = await node.methods.listSearch.getFolders.call(mockContext);

			expect(listSearchResult).toEqual({
				results: [
					{ name: 'folder1', value: '01SPEVVYBKV2ZKHGJASRA2HC7MOGBMUMAA' },
					{ name: 'folder2', value: '01SPEVVYDNI2NFECGXK5ELO4JE6RTVI2RK' },
				],
				paginationToken:
					'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/items?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
			});
		});

		it('should list search items', async () => {
			const mockResponse = {
				'@odata.nextLink':
					'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/listItems?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
				value: [
					{
						'@odata.etag': '"0ea4148a-f8e5-4f2f-a815-2e2be693b164,4"',
						id: '1',
						'fields@odata.navigationLink': 'fields',
						fields: {
							'@odata.etag': '"0ea4148a-f8e5-4f2f-a815-2e2be693b164,4"',
							Title: 'Title 1',
						},
					},
					{
						'@odata.etag': '"98af0386-66bd-4524-a653-80be05e0f14d,2"',
						id: '2',
						'fields@odata.navigationLink': 'fields',
						fields: {
							'@odata.etag': '"98af0386-66bd-4524-a653-80be05e0f14d,2"',
						},
					},
				],
			};
			const mockRequestWithAuthentication = jest.fn().mockReturnValue(mockResponse);
			const mockGetNodeParameter = jest.fn((parameterName, _fallbackValue, _options) => {
				if (parameterName === 'site') {
					return {
						value: 'site1',
					} as INodeParameterResourceLocator;
				}
				if (parameterName === 'list') {
					return {
						value: 'list1',
					} as INodeParameterResourceLocator;
				}
				throw new Error('Unknown parameter');
			});
			const mockGetCredentials = jest.fn(async (type: string, _itemIndex?: number) => {
				if (type === 'microsoftSharePointOAuth2Api') {
					return FAKE_CREDENTIALS_DATA.microsoftSharePointOAuth2Api;
				}
				throw new Error('Unknown credentials');
			});
			const mockContext = {
				getCredentials: mockGetCredentials,
				getNodeParameter: mockGetNodeParameter,
				helpers: {
					requestWithAuthentication: mockRequestWithAuthentication,
				},
			} as unknown as ILoadOptionsFunctions;
			const node = new MicrosoftSharePoint();

			const listSearchResult = await node.methods.listSearch.getItems.call(mockContext);

			expect(listSearchResult).toEqual({
				results: [
					{ name: '2', value: '2' },
					{ name: 'Title 1', value: '1' },
				],
				paginationToken:
					'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/listItems?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
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
						name: 'List 2',
					},
					{
						'@odata.etag': '"23af565a-da89-48f0-ae5f-2d4a7244b446,0"',
						id: '23af565a-da89-48f0-ae5f-2d4a7244b446',
						name: 'List 1',
					},
				],
			};
			const mockRequestWithAuthentication = jest.fn().mockReturnValue(mockResponse);
			const mockGetNodeParameter = jest.fn((parameterName, _fallbackValue, _options) => {
				if (parameterName === 'site') {
					return {
						value: 'site1',
					} as INodeParameterResourceLocator;
				}
				throw new Error('Unknown parameter');
			});
			const mockGetCredentials = jest.fn(async (type: string, _itemIndex?: number) => {
				if (type === 'microsoftSharePointOAuth2Api') {
					return FAKE_CREDENTIALS_DATA.microsoftSharePointOAuth2Api;
				}
				throw new Error('Unknown credentials');
			});
			const mockContext = {
				getCredentials: mockGetCredentials,
				getNodeParameter: mockGetNodeParameter,
				helpers: {
					requestWithAuthentication: mockRequestWithAuthentication,
				},
			} as unknown as ILoadOptionsFunctions;
			const node = new MicrosoftSharePoint();

			const listSearchResult = await node.methods.listSearch.getLists.call(mockContext);

			expect(listSearchResult).toEqual({
				results: [
					{ name: 'List 1', value: '23af565a-da89-48f0-ae5f-2d4a7244b446' },
					{ name: 'List 2', value: '58a279af-1f06-4392-a5ed-2b37fa1d6c1d' },
				],
				paginationToken:
					'https://mydomain.sharepoint.com/_api/v2.0/sites(%27mydomain.sharepoint.com,site1%27)/lists?%24skiptoken=aWQ9MjFFQkEzOUMtMkU3My00NzgwLUFBQzEtMTVDNzlDMTk4QjlB',
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
			const mockRequestWithAuthentication = jest.fn().mockReturnValue(mockResponse);
			const mockGetNodeParameter = jest.fn((_parameterName, _fallbackValue, _options) => {
				throw new Error('Unknown parameter');
			});
			const mockGetCredentials = jest.fn(async (type: string, _itemIndex?: number) => {
				if (type === 'microsoftSharePointOAuth2Api') {
					return FAKE_CREDENTIALS_DATA.microsoftSharePointOAuth2Api;
				}
				throw new Error('Unknown credentials');
			});
			const mockContext = {
				getCredentials: mockGetCredentials,
				getNodeParameter: mockGetNodeParameter,
				helpers: {
					requestWithAuthentication: mockRequestWithAuthentication,
				},
			} as unknown as ILoadOptionsFunctions;
			const node = new MicrosoftSharePoint();

			const listSearchResult = await node.methods.listSearch.getSites.call(mockContext);

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
	});
});
