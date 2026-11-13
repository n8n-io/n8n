import { mockDeep } from 'vitest-mock-extended';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeType,
	IRequestOptions,
} from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import { S3 } from '../../S3.node';
import { S3 as LegacyS3 } from './legacy/S3';

type Captured = IDataObject | { error: string };

const keys = {
	accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
	secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
};

const credentialConfigs: Record<string, ICredentialDataDecryptedObject> = {
	'AWS endpoint': {
		...keys,
		endpoint: 'https://s3.eu-central-1.amazonaws.com',
		region: 'eu-central-1',
	},
	'AWS endpoint with path style': {
		...keys,
		endpoint: 'https://s3.eu-central-1.amazonaws.com',
		region: 'eu-central-1',
		forcePathStyle: true,
	},
	'custom endpoint with port': {
		...keys,
		endpoint: 'http://minio.example.com:9000',
		region: 'us-east-1',
	},
	'custom endpoint with port and path style': {
		...keys,
		endpoint: 'http://minio.example.com:9000',
		region: 'us-east-1',
		forcePathStyle: true,
	},
	'custom endpoint with a path prefix': {
		...keys,
		endpoint: 'https://gateway.example.com/storage',
		region: 'us-east-1',
	},
	'custom endpoint with a path prefix and path style': {
		...keys,
		endpoint: 'https://gateway.example.com/storage/',
		region: 'us-east-1',
		forcePathStyle: true,
	},
	'ignore SSL issues': {
		...keys,
		endpoint: 'https://minio.internal:9443',
		region: 'us-east-1',
		ignoreSSLIssues: true,
	},
	'temporary credentials': {
		...keys,
		endpoint: 'https://s3.eu-west-1.amazonaws.com',
		region: 'eu-west-1',
		temporaryCredentials: true,
		sessionToken: 'FwoGZXIvYXdzEXAMPLETOKEN',
	},
};

const bucketNames = ['orders-archive', 'logs.example.com', 'Legacy_Bucket'];

const objectKeys = [
	'report.pdf',
	'docs/2024/report.pdf',
	'my report.pdf',
	'report%20final.pdf',
	'50%20off%.txt',
	'100%.txt',
	'a+b.txt',
	'list[1]^|;.txt',
	'time:12.txt',
	'résumé-日本.txt',
	'a//b.txt',
	'/leading.txt',
	'folder/',
	'back\\slash.txt',
	'docs/../report.pdf',
];

type Operation = { name: string; keyInPath: boolean; parameters: IDataObject };

function operations(bucketName: string, key: string): Operation[] {
	return [
		{
			name: 'bucket create',
			keyInPath: false,
			parameters: { resource: 'bucket', operation: 'create', name: bucketName },
		},
		{
			name: 'bucket delete',
			keyInPath: false,
			parameters: { resource: 'bucket', operation: 'delete', name: bucketName },
		},
		{
			name: 'bucket get many',
			keyInPath: false,
			parameters: { resource: 'bucket', operation: 'getAll', returnAll: true },
		},
		{
			name: 'bucket search',
			keyInPath: false,
			parameters: {
				resource: 'bucket',
				operation: 'search',
				bucketName,
				returnAll: true,
				additionalFields: { prefix: key },
			},
		},
		{
			name: 'folder create',
			keyInPath: true,
			parameters: { resource: 'folder', operation: 'create', bucketName, folderName: key },
		},
		{
			name: 'folder create in parent',
			keyInPath: true,
			parameters: {
				resource: 'folder',
				operation: 'create',
				bucketName,
				folderName: 'sub',
				additionalFields: { parentFolderKey: key },
			},
		},
		{
			name: 'folder delete',
			keyInPath: true,
			parameters: { resource: 'folder', operation: 'delete', bucketName, folderKey: key },
		},
		{
			name: 'folder get many',
			keyInPath: false,
			parameters: {
				resource: 'folder',
				operation: 'getAll',
				bucketName,
				returnAll: true,
				options: { folderKey: key },
			},
		},
		{
			name: 'file copy',
			keyInPath: true,
			parameters: {
				resource: 'file',
				operation: 'copy',
				sourcePath: `/${bucketName}/source.txt`,
				destinationPath: `/${bucketName}/${key}`,
			},
		},
		{
			name: 'file download',
			keyInPath: true,
			parameters: { resource: 'file', operation: 'download', bucketName, fileKey: key },
		},
		{
			name: 'file delete',
			keyInPath: true,
			parameters: { resource: 'file', operation: 'delete', bucketName, fileKey: key },
		},
		{
			name: 'file get many',
			keyInPath: false,
			parameters: {
				resource: 'file',
				operation: 'getAll',
				bucketName,
				returnAll: true,
				options: { folderKey: key },
			},
		},
		{
			name: 'file upload text',
			keyInPath: true,
			parameters: {
				resource: 'file',
				operation: 'upload',
				bucketName,
				fileName: key,
				binaryData: false,
				fileContent: 'hello',
			},
		},
		{
			name: 'file upload text in parent',
			keyInPath: true,
			parameters: {
				resource: 'file',
				operation: 'upload',
				bucketName,
				fileName: 'notes.txt',
				binaryData: false,
				fileContent: 'hello',
				additionalFields: { parentFolderKey: key },
			},
		},
		{
			name: 'file upload binary',
			keyInPath: true,
			parameters: {
				resource: 'file',
				operation: 'upload',
				bucketName,
				fileName: key,
				binaryData: true,
			},
		},
	];
}

const xml = (body: string) => `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;

function respond(options: IRequestOptions, region: string) {
	const query = (options.qs ?? {}) as IDataObject;
	if ('location' in query) {
		return xml(
			`<LocationConstraint xmlns="http://s3.amazonaws.com/doc/2006-03-01/">${region}</LocationConstraint>`,
		);
	}
	if ('list-type' in query) {
		return xml('<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>');
	}
	if (options.resolveWithFullResponse) {
		return { body: 'hello', headers: { 'content-type': 'text/plain' } };
	}
	if (options.method === 'PUT' && (options.headers as IDataObject)['x-amz-copy-source']) {
		return xml('<CopyObjectResult><ETag>"copy"</ETag></CopyObjectResult>');
	}
	if (options.method === 'GET') {
		return xml('<ListAllMyBucketsResult><Buckets></Buckets></ListAllMyBucketsResult>');
	}
	return '';
}

async function capture(
	node: INodeType,
	parameters: IDataObject,
	credentials: ICredentialDataDecryptedObject,
): Promise<Captured[]> {
	const requests: Captured[] = [];
	const context = mockDeep<IExecuteFunctions>();
	const values: IDataObject = {
		additionalFields: {},
		options: {},
		tagsUi: {},
		binaryPropertyName: 'data',
		returnAll: false,
		limit: 5,
		...parameters,
	};
	context.getNodeParameter.mockImplementation(
		(name: string, _itemIndex: number, fallback?: unknown) =>
			(name in values ? values[name] : fallback) as never,
	);
	context.getCredentials.mockResolvedValue(credentials);
	context.getInputData.mockReturnValue([{ json: {} }]);
	context.getNode.mockReturnValue({ name: 'S3', typeVersion: 1 } as INode);
	context.continueOnFail.mockReturnValue(false);
	context.helpers.returnJsonArray.mockImplementation((data) =>
		(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
	);
	context.helpers.constructExecutionMetaData.mockImplementation((data) => data as never);
	context.helpers.prepareBinaryData.mockResolvedValue({ data: '', mimeType: 'text/plain' });
	context.helpers.assertBinaryData.mockReturnValue({
		data: '',
		mimeType: 'text/plain',
		fileName: 'local.txt',
	});
	context.helpers.getBinaryDataBuffer.mockResolvedValue(Buffer.from('hello'));
	context.helpers.request.mockImplementation(async (uriOrObject) => {
		const options = uriOrObject as IRequestOptions;
		const { body: _body, ...request } = options;
		requests.push(deepCopy(request) as IDataObject);
		return respond(options, credentials.region as string);
	});

	try {
		await node.execute!.call(context);
	} catch (error) {
		requests.push({ error: (error as Error).message });
	}
	return requests;
}

const hasDotSegment = (key: string) =>
	key.split(/[/\\]/).some((part) => part === '.' || part === '..');

describe('S3 request regression', () => {
	const current = new S3();
	const legacy = new LegacyS3();

	beforeAll(() => {
		vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-12T12:00:00Z') });
	});

	afterAll(() => {
		vi.useRealTimers();
	});

	describe.each(Object.keys(credentialConfigs))('%s', (configName) => {
		const credentials = credentialConfigs[configName];

		test.each(bucketNames)(
			'bucket "%s" sends the same requests',
			async (bucketName) => {
				for (const key of objectKeys) {
					for (const operation of operations(bucketName, key)) {
						const label = `${operation.name} with key "${key}"`;
						const actual = await capture(current, operation.parameters, credentials);

						if (operation.keyInPath && hasDotSegment(key)) {
							// Expected difference: "." and ".." key parts are rejected.
							// Before, the URL parser removed them and S3 used a different key.
							expect(actual.at(-1), label).toEqual({ error: expect.stringContaining('Invalid') });
							continue;
						}

						const downloadsFolder = operation.name === 'file download' && key.endsWith('/');
						expect(
							actual.filter((request) => 'error' in request),
							label,
						).toHaveLength(downloadsFolder ? 1 : 0);
						expect(
							actual.some((request) => 'uri' in request),
							label,
						).toBe(!downloadsFolder);

						const runLegacy = async (legacyKey: string) =>
							await capture(
								legacy,
								operations(bucketName, legacyKey).find(
									(candidate) => candidate.name === operation.name,
								)!.parameters,
								credentials,
							);
						expect(actual, label).toEqual(await runLegacy(key));
					}
				}
			},
			120_000,
		);
	});
});
