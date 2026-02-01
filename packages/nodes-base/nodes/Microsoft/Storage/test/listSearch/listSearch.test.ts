import type { ILoadOptionsFunctions, INodeParameterResourceLocator } from 'n8n-workflow';

import { AzureStorage } from '../../AzureStorage.node';
import { XMsVersion } from '../../GenericFunctions';
import { credentials } from '../credentials';

describe('Azure Storage Node', () => {
	const { baseUrl } = credentials.azureStorageOAuth2Api;

	describe('List search', () => {
		it('should list search blobs', async () => {
			const mockResponse = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><EnumerationResults ServiceEndpoint="${baseUrl}" ContainerName="item1"><Prefix/><Marker/><MaxResults>1</MaxResults><Blobs><Blob><Name>myblob1</Name><Properties><Creation-Time>Wed, 22 Jan 2025 18:53:15 GMT</Creation-Time><Last-Modified>Wed, 22 Jan 2025 18:53:15 GMT</Last-Modified><Etag>0x1F8268B228AA730</Etag><Content-Length>37</Content-Length><Content-Type>application/json</Content-Type><Content-MD5>aWQGHD8kGQd5ZtEN/S1/aw==</Content-MD5><BlobType>BlockBlob</BlobType><LeaseStatus>unlocked</LeaseStatus><LeaseState>available</LeaseState><ServerEncrypted>true</ServerEncrypted><AccessTier>Hot</AccessTier><AccessTierInferred>true</AccessTierInferred><AccessTierChangeTime>Wed, 22 Jan 2025 18:53:15 GMT</AccessTierChangeTime></Properties></Blob></Blobs><NextMarker>myblob2</NextMarker></EnumerationResults>`;
			const mockRequestWithAuthentication = jest.fn().mockReturnValue(mockResponse);
			const mockGetNodeParameter = jest.fn((parameterName, _fallbackValue, _options) => {
				if (parameterName === 'authentication') {
					return 'sharedKey';
				}
				if (parameterName === 'container') {
					return {
						value: 'mycontainer',
					} as INodeParameterResourceLocator;
				}

				throw new Error('Unknown parameter');
			});
			const mockGetCredentials = jest.fn(async (type: string, _itemIndex?: number) => {
				if (type === 'azureStorageSharedKeyApi') {
					return credentials.azureStorageSharedKeyApi;
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
			jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00Z'));
			const node = new AzureStorage();

			const listSearchResult = await node.methods.listSearch.getBlobs.call(mockContext);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith('azureStorageSharedKeyApi', {
				method: 'GET',
				url: `${baseUrl}/mycontainer`,
				headers: {
					'x-ms-date': 'Wed, 01 Jan 2025 00:00:00 GMT',
					'x-ms-version': XMsVersion,
				},
				qs: {
					comp: 'list',
					maxresults: 5000,
					restype: 'container',
				},
				body: {},
			});
			expect(listSearchResult).toEqual({
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				results: [{ name: 'myblob1', value: 'myblob1' }],
				paginationToken: 'myblob2',
			});
		});

		it('should list search containers', async () => {
			const mockResponse = `<?xml version="1.0" encoding="utf-8"?><EnumerationResults ServiceEndpoint="${baseUrl}/"><Prefix>mycontainer</Prefix><MaxResults>1</MaxResults><Containers><Container><Name>mycontainer1</Name><Deleted>true</Deleted><Version>01DB7228F6BEE6E7</Version><Properties><Last-Modified>Wed, 29 Jan 2025 08:37:00 GMT</Last-Modified><Etag>"0x8DD40401935032C"</Etag><LeaseStatus>unlocked</LeaseStatus><LeaseState>expired</LeaseState><HasImmutabilityPolicy>false</HasImmutabilityPolicy><HasLegalHold>false</HasLegalHold><ImmutableStorageWithVersioningEnabled>false</ImmutableStorageWithVersioningEnabled><DeletedTime>Wed, 29 Jan 2025 08:38:21 GMT</DeletedTime><RemainingRetentionDays>7</RemainingRetentionDays></Properties><Metadata><key1>value1</key1></Metadata></Container></Containers><NextMarker>mycontainer2</NextMarker></EnumerationResults>`;
			const mockRequestWithAuthentication = jest.fn().mockReturnValue(mockResponse);
			const mockGetNodeParameter = jest.fn((parameterName, _fallbackValue, _options) => {
				if (parameterName === 'authentication') {
					return 'sharedKey';
				}

				throw new Error('Unknown parameter');
			});
			const mockGetCredentials = jest.fn(async (type: string, _itemIndex?: number) => {
				if (type === 'azureStorageSharedKeyApi') {
					return credentials.azureStorageSharedKeyApi;
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
			jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00Z'));
			const node = new AzureStorage();

			const listSearchResult = await node.methods.listSearch.getContainers.call(mockContext);

			expect(mockRequestWithAuthentication).toHaveBeenCalledWith('azureStorageSharedKeyApi', {
				method: 'GET',
				url: `${baseUrl}/`,
				headers: {
					'x-ms-date': 'Wed, 01 Jan 2025 00:00:00 GMT',
					'x-ms-version': XMsVersion,
				},
				qs: {
					comp: 'list',
					maxresults: 5000,
				},
				body: {},
			});
			expect(listSearchResult).toEqual({
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				results: [{ name: 'mycontainer1', value: 'mycontainer1' }],
				paginationToken: 'mycontainer2',
			});
		});
	});
});
