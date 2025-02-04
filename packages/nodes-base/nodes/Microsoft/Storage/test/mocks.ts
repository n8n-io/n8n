export const azureStorageApiResponse = {
	blobPut: {
		headers: {
			server: 'Azurite-Blob/3.33.0',
			etag: '"0x22769D26D3F3740"',
			'last-modified': 'Thu, 23 Jan 2025 17:53:23 GMT',
			'content-md5': 'aWQGHD8kGQd5ZtEN/S1/aw==',
			'x-ms-request-id': '75b87ee3-a7f7-468d-b7d1-e7e7b3173dab',
			'x-ms-version': '2025-01-05',
			date: 'Thu, 23 Jan 2025 17:53:23 GMT',
			'x-ms-request-server-encrypted': 'true',
			'keep-alive': 'timeout=5',
			'content-length': '0',
			'x-ms-version-id': 'Thu, 23 Jan 2025 17:53:23 GMT',
			'access-control-allow-credentials': 'access-control-allow-credentials',
			'access-control-allow-origin': 'access-control-allow-origin',
			'access-control-expose-headers': 'access-control-expose-headers',
			'x-ms-content-crc64': 'x-ms-content-crc64',
			'x-ms-encryption-key-sha256': 'x-ms-encryption-key-sha256',
			'x-ms-encryption-scope': 'x-ms-encryption-scope',
		},
	},

	blobDelete: {
		headers: {
			'x-ms-request-id': '75b87ee3-a7f7-468d-b7d1-e7e7b3173dab',
			'x-ms-version': '2025-01-05',
			date: 'Thu, 23 Jan 2025 17:53:23 GMT',
			'x-ms-delete-type-permanent': 'true',
			'x-ms-client-request-id': 'x-ms-client-request-id',
		},
	},

	blobGet: {
		headers: {
			'x-ms-request-id': '75b87ee3-a7f7-468d-b7d1-e7e7b3173dab',
			'x-ms-version': '2025-01-05',
			date: 'Thu, 23 Jan 2025 17:53:23 GMT',
			'x-ms-client-request-id': 'x-ms-client-request-id',
			'last-modified': 'last-modified',
			'x-ms-creation-time': 'x-ms-creation-time',
			'x-ms-tag-count': 'x-ms-tag-count',
			// 'content-length': '37',
			'content-type': 'content-type',
			'content-range': 'content-range',
			etag: '"0x22769D26D3F3740"',
			'content-md5': 'content-md5',
			'x-ms-content-crc64': 'x-ms-content-crc64',
			'content-encoding': 'content-encoding',
			'content-language': 'content-language',
			'cache-control': 'cache-control',
			'content-disposition': 'content-disposition',
			'x-ms-blob-sequence-number': 'x-ms-blob-sequence-number',
			'x-ms-blob-type': 'x-ms-blob-type',
			'x-ms-copy-completion-time': 'x-ms-copy-completion-time',
			'x-ms-copy-status-description': 'x-ms-copy-status-description',
			'x-ms-copy-id': 'x-ms-copy-id',
			'x-ms-copy-progress': 'x-ms-copy-progress',
			'x-ms-copy-source': 'x-ms-copy-source',
			'x-ms-copy-status': 'x-ms-copy-status',
			'x-ms-incremental-copy': 'x-ms-incremental-copy',
			'x-ms-lease-duration': 'x-ms-lease-duration',
			'x-ms-lease-state': 'x-ms-lease-state',
			'x-ms-lease-status': 'x-ms-lease-status',
			'accept-ranges': 'accept-ranges',
			'access-control-allow-origin': 'access-control-allow-origin',
			'access-control-expose-headers': 'access-control-expose-headers',
			vary: 'vary',
			'access-control-allow-credentials': 'access-control-allow-credentials',
			'x-ms-blob-committed-block-count': 'x-ms-blob-committed-block-count',
			'x-ms-server-encrypted': 'x-ms-server-encrypted',
			'x-ms-encryption-key-sha256': 'x-ms-encryption-key-sha256',
			'x-ms-encryption-context': 'x-ms-encryption-context',
			'x-ms-encryption-scope': 'x-ms-encryption-scope',
			'x-ms-blob-content-md5': 'x-ms-blob-content-md5',
			'x-ms-last-access-time': 'x-ms-last-access-time',
			'x-ms-blob-sealed': 'x-ms-blob-sealed',
			'x-ms-immutability-policy-until-date': 'x-ms-immutability-policy-until-date',
			'x-ms-immutability-policy-mode': 'x-ms-immutability-policy-mode',
			'x-ms-legal-hold': 'x-ms-legal-hold',
			'x-ms-owner': 'x-ms-owner',
			'x-ms-group': 'x-ms-group',
			'x-ms-permissions': 'x-ms-permissions',
			'x-ms-acl': 'x-ms-acl',
			'x-ms-resource-type': 'x-ms-resource-type',
		},
	},

	blobList: {
		body: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><EnumerationResults ServiceEndpoint="https://myaccount.blob.core.windows.net" ContainerName="item1"><Prefix/><Marker/><MaxResults>1</MaxResults><Blobs><Blob><Name>myblob1</Name><Properties><Creation-Time>Wed, 22 Jan 2025 18:53:15 GMT</Creation-Time><Last-Modified>Wed, 22 Jan 2025 18:53:15 GMT</Last-Modified><Etag>0x1F8268B228AA730</Etag><Content-Length>37</Content-Length><Content-Type>application/json</Content-Type><Content-MD5>aWQGHD8kGQd5ZtEN/S1/aw==</Content-MD5><BlobType>BlockBlob</BlobType><LeaseStatus>unlocked</LeaseStatus><LeaseState>available</LeaseState><ServerEncrypted>true</ServerEncrypted><AccessTier>Hot</AccessTier><AccessTierInferred>true</AccessTierInferred><AccessTierChangeTime>Wed, 22 Jan 2025 18:53:15 GMT</AccessTierChangeTime></Properties></Blob></Blobs><NextMarker>myblob2</NextMarker></EnumerationResults>',
	},

	blobListNoMarker: {
		body: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><EnumerationResults ServiceEndpoint="https://myaccount.blob.core.windows.net" ContainerName="item1"><Prefix/><Marker/><MaxResults>1</MaxResults><Blobs><Blob><Name>myblob1</Name><Properties><Creation-Time>Wed, 22 Jan 2025 18:53:15 GMT</Creation-Time><Last-Modified>Wed, 22 Jan 2025 18:53:15 GMT</Last-Modified><Etag>0x1F8268B228AA730</Etag><Content-Length>37</Content-Length><Content-Type>application/json</Content-Type><Content-MD5>aWQGHD8kGQd5ZtEN/S1/aw==</Content-MD5><BlobType>BlockBlob</BlobType><LeaseStatus>unlocked</LeaseStatus><LeaseState>available</LeaseState><ServerEncrypted>true</ServerEncrypted><AccessTier>Hot</AccessTier><AccessTierInferred>true</AccessTierInferred><AccessTierChangeTime>Wed, 22 Jan 2025 18:53:15 GMT</AccessTierChangeTime></Properties></Blob></Blobs><NextMarker></NextMarker></EnumerationResults>',
	},

	containerCreate: {
		headers: {
			etag: '"0x22769D26D3F3740"',
			'last-modified': 'Thu, 23 Jan 2025 17:53:23 GMT',
			'x-ms-request-id': '75b87ee3-a7f7-468d-b7d1-e7e7b3173dab',
			'x-ms-version': '2025-01-05',
			date: 'Thu, 23 Jan 2025 17:53:23 GMT',
			'x-ms-request-server-encrypted': 'true',
			'x-ms-client-request-id': 'client-request-id-123',
		},
	},

	containerDelete: {
		headers: {
			'content-length': '0',
			server: 'Windows-Azure-Blob/1.0 Microsoft-HTTPAPI/2.0',
			'x-ms-request-id': 'ca3a8907-601e-0050-1929-723410000000',
			'x-ms-version': '2020-10-02',
			date: 'Wed, 29 Jan 2025 08:38:21 GMT',
		},
	},

	containerGet: {
		headers: {
			'content-length': '0',
			'last-modified': 'Tue, 28 Jan 2025 16:40:21 GMT',
			etag: '"0x8DD3FBA74CF3620"',
			server: 'Windows-Azure-Blob/1.0 Microsoft-HTTPAPI/2.0',
			'x-ms-request-id': '49edb268-b01e-0053-6e29-72d574000000',
			'x-ms-version': '2020-10-02',
			'x-ms-lease-status': 'unlocked',
			'x-ms-lease-state': 'available',
			'x-ms-has-immutability-policy': 'false',
			'x-ms-has-legal-hold': 'false',
			date: 'Wed, 29 Jan 2025 08:43:08 GMT',
			'x-ms-meta-key1': 'field1',
			'x-ms-blob-public-access': 'blob',
			'x-ms-lease-duration': 'infinite',
		},
	},

	containerList: {
		body: '<?xml version="1.0" encoding="utf-8"?><EnumerationResults ServiceEndpoint="https://myaccount.blob.core.windows.net/"><Prefix>mycontainer</Prefix><MaxResults>1</MaxResults><Containers><Container><Name>mycontainer1</Name><Deleted>true</Deleted><Version>01DB7228F6BEE6E7</Version><Properties><Last-Modified>Wed, 29 Jan 2025 08:37:00 GMT</Last-Modified><Etag>"0x8DD40401935032C"</Etag><LeaseStatus>unlocked</LeaseStatus><LeaseState>expired</LeaseState><HasImmutabilityPolicy>false</HasImmutabilityPolicy><HasLegalHold>false</HasLegalHold><ImmutableStorageWithVersioningEnabled>false</ImmutableStorageWithVersioningEnabled><DeletedTime>Wed, 29 Jan 2025 08:38:21 GMT</DeletedTime><RemainingRetentionDays>7</RemainingRetentionDays></Properties><Metadata><key1>value1</key1></Metadata></Container></Containers><NextMarker>mycontainer2</NextMarker></EnumerationResults>',
	},

	containerListNoMarker: {
		body: '<?xml version="1.0" encoding="utf-8"?><EnumerationResults ServiceEndpoint="https://myaccount.blob.core.windows.net/"><Prefix>mycontainer</Prefix><MaxResults>1</MaxResults><Containers><Container><Name>mycontainer1</Name><Deleted>true</Deleted><Version>01DB7228F6BEE6E7</Version><Properties><Last-Modified>Wed, 29 Jan 2025 08:37:00 GMT</Last-Modified><Etag>"0x8DD40401935032C"</Etag><LeaseStatus>unlocked</LeaseStatus><LeaseState>expired</LeaseState><HasImmutabilityPolicy>false</HasImmutabilityPolicy><HasLegalHold>false</HasLegalHold><ImmutableStorageWithVersioningEnabled>false</ImmutableStorageWithVersioningEnabled><DeletedTime>Wed, 29 Jan 2025 08:38:21 GMT</DeletedTime><RemainingRetentionDays>7</RemainingRetentionDays></Properties><Metadata><key1>value1</key1></Metadata></Container></Containers><NextMarker></NextMarker></EnumerationResults>',
	},
};

export const azureStorageNodeResponse = {
	blobCreate: [
		{
			json: {
				etag: '"0x22769D26D3F3740"',
				lastModified: 'Thu, 23 Jan 2025 17:53:23 GMT',
				contentMd5: 'aWQGHD8kGQd5ZtEN/S1/aw==',
				requestId: '75b87ee3-a7f7-468d-b7d1-e7e7b3173dab',
				version: '2025-01-05',
				date: 'Thu, 23 Jan 2025 17:53:23 GMT',
				requestServerEncrypted: true,
				accessControlAllowCredentials: 'access-control-allow-credentials',
				accessControlAllowOrigin: 'access-control-allow-origin',
				accessControlExposeHeaders: 'access-control-expose-headers',
				contentCrc64: 'x-ms-content-crc64',
				contentLength: 0,
				encryptionKeySha256: 'x-ms-encryption-key-sha256',
				encryptionScope: 'x-ms-encryption-scope',
				versionId: 'Thu, 23 Jan 2025 17:53:23 GMT',
				keepAlive: 'timeout=5',
				server: 'Azurite-Blob/3.33.0',
			},
		},
	],

	blobDelete: [
		{
			json: {
				requestId: '75b87ee3-a7f7-468d-b7d1-e7e7b3173dab',
				version: '2025-01-05',
				date: 'Thu, 23 Jan 2025 17:53:23 GMT',
				deleteTypePermanent: true,
				clientRequestId: 'x-ms-client-request-id',
			},
		},
	],

	blobGet: [
		{
			binary: {
				data: {
					data: 'ewoiZGF0YSI6ewoibXlfZmllbGRfMSI6InZhbHVlIiwKIm15X2ZpZWxkXzIiOjEKfQp9',
					fileExtension: undefined,
					fileSize: '51 B',
					fileType: undefined,
					mimeType: 'content-type',
				},
			},
			json: {
				clientRequestId: 'x-ms-client-request-id',
				lastModified: 'last-modified',
				creationTime: 'x-ms-creation-time',
				tagCount: 'x-ms-tag-count',
				// contentLength: 37,
				contentType: 'content-type',
				contentRange: 'content-range',
				etag: '"0x22769D26D3F3740"',
				contentMd5: 'content-md5',
				contentCrc64: 'x-ms-content-crc64',
				contentEncoding: 'content-encoding',
				contentLanguage: 'content-language',
				cacheControl: 'cache-control',
				contentDisposition: 'content-disposition',
				blobSequenceNumber: 'x-ms-blob-sequence-number',
				blobType: 'x-ms-blob-type',
				copyCompletionTime: 'x-ms-copy-completion-time',
				copyStatusDescription: 'x-ms-copy-status-description',
				copyId: 'x-ms-copy-id',
				copyProgress: 'x-ms-copy-progress',
				copySource: 'x-ms-copy-source',
				copyStatus: 'x-ms-copy-status',
				incrementalCopy: 'x-ms-incremental-copy',
				leaseDuration: 'x-ms-lease-duration',
				leaseState: 'x-ms-lease-state',
				leaseStatus: 'x-ms-lease-status',
				accessControlAllowOrigin: 'access-control-allow-origin',
				accessControlExposeHeaders: 'access-control-expose-headers',
				vary: 'vary',
				accessControlAllowCredentials: 'access-control-allow-credentials',
				blobCommittedBlockCount: 'x-ms-blob-committed-block-count',
				serverEncrypted: 'x-ms-server-encrypted',
				encryptionKeySha256: 'x-ms-encryption-key-sha256',
				encryptionContext: 'x-ms-encryption-context',
				encryptionScope: 'x-ms-encryption-scope',
				blobContentMd5: 'x-ms-blob-content-md5',
				lastAccessTime: 'x-ms-last-access-time',
				blobSealed: 'x-ms-blob-sealed',
				immutabilityPolicyUntilDate: 'x-ms-immutability-policy-until-date',
				immutabilityPolicyMode: 'x-ms-immutability-policy-mode',
				legalHold: 'x-ms-legal-hold',
				owner: 'x-ms-owner',
				group: 'x-ms-group',
				permissions: 'x-ms-permissions',
				acl: 'x-ms-acl',
				resourceType: 'x-ms-resource-type',
			},
		},
	],

	blobGetAll: [
		{
			json: {
				name: 'myblob1',
				properties: {
					creationTime: 'Wed, 22 Jan 2025 18:53:15 GMT',
					lastModified: 'Wed, 22 Jan 2025 18:53:15 GMT',
					etag: '0x1F8268B228AA730',
					contentLength: 37,
					contentType: 'application/json',
					contentMD5: 'aWQGHD8kGQd5ZtEN/S1/aw==',
					blobType: 'BlockBlob',
					leaseStatus: 'unlocked',
					leaseState: 'available',
					serverEncrypted: true,
					accessTier: 'Hot',
					accessTierInferred: true,
					accessTierChangeTime: 'Wed, 22 Jan 2025 18:53:15 GMT',
				},
			},
		},
	],

	containerCreate: [
		{
			json: {
				etag: '"0x22769D26D3F3740"',
				lastModified: 'Thu, 23 Jan 2025 17:53:23 GMT',
				requestId: '75b87ee3-a7f7-468d-b7d1-e7e7b3173dab',
				version: '2025-01-05',
				date: 'Thu, 23 Jan 2025 17:53:23 GMT',
				clientRequestId: 'client-request-id-123',
				requestServerEncrypted: true,
			},
		},
	],

	containerDelete: [
		{
			json: {
				contentLength: 0,
				requestId: 'ca3a8907-601e-0050-1929-723410000000',
				server: 'Windows-Azure-Blob/1.0 Microsoft-HTTPAPI/2.0',
				version: '2020-10-02',
				date: 'Wed, 29 Jan 2025 08:38:21 GMT',
			},
		},
	],

	containerGet: [
		{
			json: {
				name: 'mycontainer',
				properties: {
					lastModified: 'Tue, 28 Jan 2025 16:40:21 GMT',
					etag: '"0x8DD3FBA74CF3620"',
					leaseStatus: 'unlocked',
					leaseState: 'available',
					hasImmutabilityPolicy: false,
					hasLegalHold: false,
					leaseDuration: 'infinite',
					blobPublicAccess: 'blob',
				},
				metadata: {
					key1: 'field1',
				},
			},
		},
	],

	containerGetAll: [
		{
			json: {
				name: 'mycontainer1',
				deleted: true,
				version: '01DB7228F6BEE6E7',
				properties: {
					lastModified: 'Wed, 29 Jan 2025 08:37:00 GMT',
					etag: '"0x8DD40401935032C"',
					leaseStatus: 'unlocked',
					leaseState: 'expired',
					hasImmutabilityPolicy: false,
					hasLegalHold: false,
					immutableStorageWithVersioningEnabled: 'false',
					deletedTime: 'Wed, 29 Jan 2025 08:38:21 GMT',
					remainingRetentionDays: 7,
				},
				metadata: {
					key1: 'value1',
				},
			},
		},
	],
};
