import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { credentials } from '../credentials';

describe('Azure Storage Node', () => {
	const { baseUrl } = credentials.azureStorageOAuth2Api;
	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['blob_getAll.workflow.json'],
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'get',
					path: '/mycontainer?restype=container&comp=list',
					statusCode: 200,
					responseBody: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><EnumerationResults ServiceEndpoint="${baseUrl}" ContainerName="item1"><Prefix/><Marker/><MaxResults>1</MaxResults><Blobs><Blob><Name>myblob1</Name><Properties><Creation-Time>Wed, 22 Jan 2025 18:53:15 GMT</Creation-Time><Last-Modified>Wed, 22 Jan 2025 18:53:15 GMT</Last-Modified><Etag>0x1F8268B228AA730</Etag><Content-Length>37</Content-Length><Content-Type>application/json</Content-Type><Content-MD5>aWQGHD8kGQd5ZtEN/S1/aw==</Content-MD5><BlobType>BlockBlob</BlobType><LeaseStatus>unlocked</LeaseStatus><LeaseState>available</LeaseState><ServerEncrypted>true</ServerEncrypted><AccessTier>Hot</AccessTier><AccessTierInferred>true</AccessTierInferred><AccessTierChangeTime>Wed, 22 Jan 2025 18:53:15 GMT</AccessTierChangeTime></Properties></Blob></Blobs><NextMarker>myblob2</NextMarker></EnumerationResults>`,
				},
				{
					method: 'get',
					path: '/mycontainer?restype=container&comp=list&marker=myblob2',
					statusCode: 200,
					responseBody: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><EnumerationResults ServiceEndpoint="${baseUrl}" ContainerName="item1"><Prefix/><Marker/><MaxResults>1</MaxResults><Blobs><Blob><Name>myblob1</Name><Properties><Creation-Time>Wed, 22 Jan 2025 18:53:15 GMT</Creation-Time><Last-Modified>Wed, 22 Jan 2025 18:53:15 GMT</Last-Modified><Etag>0x1F8268B228AA730</Etag><Content-Length>37</Content-Length><Content-Type>application/json</Content-Type><Content-MD5>aWQGHD8kGQd5ZtEN/S1/aw==</Content-MD5><BlobType>BlockBlob</BlobType><LeaseStatus>unlocked</LeaseStatus><LeaseState>available</LeaseState><ServerEncrypted>true</ServerEncrypted><AccessTier>Hot</AccessTier><AccessTierInferred>true</AccessTierInferred><AccessTierChangeTime>Wed, 22 Jan 2025 18:53:15 GMT</AccessTierChangeTime></Properties></Blob></Blobs><NextMarker></NextMarker></EnumerationResults>`,
				},
			],
		},
	});
});
