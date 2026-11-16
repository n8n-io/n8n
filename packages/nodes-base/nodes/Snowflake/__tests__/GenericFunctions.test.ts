import crypto from 'crypto';
import type { IDataObject, IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import snowflake from 'snowflake-sdk';
import { mock, type MockProxy } from 'vitest-mock-extended';

import {
	connect,
	destroy,
	escapeSnowflakeObjectIdentifier,
	execute,
	getConnectionOptions,
	isFileTransferQuery,
	prepareQueryResults,
	type SnowflakeCredential,
} from '../GenericFunctions';

vi.mock('crypto');

describe('isFileTransferQuery', () => {
	it.each([
		'GET @stage file:///tmp',
		'put file:///tmp/file.csv @stage',
		'PUT/**/file:///tmp/file.csv @stage',
		'GET/* separator */@stage file:///tmp',
		'PUT-- separator\nfile:///tmp/file.csv @stage',
		'GET// separator\n@stage file:///tmp',
		'-- leading comment\nGET @stage file:///tmp',
		'// leading comment\nPUT file:///tmp/file.csv @stage',
		'/* leading comment */ GET @stage file:///tmp',
	])('detects file-transfer query: %s', (query) => {
		expect(isFileTransferQuery(query)).toBe(true);
	});

	it.each([
		'SELECT 1',
		"SELECT 'PUT/**/file:///tmp/file.csv @stage'",
		"SELECT 'GET @stage file:///tmp'",
		'',
		'-- comment only',
		'/* comment only */',
	])('allows non-file-transfer query: %s', (query) => {
		expect(isFileTransferQuery(query)).toBe(false);
	});
});

describe('escapeSnowflakeObjectIdentifier', () => {
	it('quotes a single-part identifier', () => {
		expect(escapeSnowflakeObjectIdentifier('orders')).toBe('"ORDERS"');
	});

	it('quotes each segment of a two-part identifier', () => {
		expect(escapeSnowflakeObjectIdentifier('schema.orders')).toBe('"SCHEMA"."ORDERS"');
	});

	it('quotes each segment of a three-part identifier', () => {
		expect(escapeSnowflakeObjectIdentifier('db.schema.orders')).toBe('"DB"."SCHEMA"."ORDERS"');
	});

	it('preserves case for pre-quoted identifiers', () => {
		expect(escapeSnowflakeObjectIdentifier('"myTable"')).toBe('"myTable"');
	});

	it('does not split on dots inside quoted segments', () => {
		expect(escapeSnowflakeObjectIdentifier('"my.schema"."my.table"')).toBe(
			'"my.schema"."my.table"',
		);
	});
});

describe('getConnectionOptions', () => {
	const commonOptions = {
		account: 'test-account',
		database: 'test-database',
		schema: 'test-schema',
		warehouse: 'test-warehouse',
		role: 'test-role',
		clientSessionKeepAlive: true,
	};

	describe('date serialization', () => {
		const passwordCredential = {
			...commonOptions,
			authentication: 'password' as const,
			username: 'test-username',
			password: 'test-password',
		};

		it('should request dates as strings on version 1.1', () => {
			const result = getConnectionOptions(passwordCredential, 1.1);
			expect(result.fetchAsString).toEqual(['Date']);
		});

		it('should not request dates as strings before version 1.1', () => {
			expect(getConnectionOptions(passwordCredential, 1)).not.toHaveProperty('fetchAsString');
			expect(getConnectionOptions(passwordCredential)).not.toHaveProperty('fetchAsString');
		});
	});

	describe('should return connection options', () => {
		it('with username and password for password authentication', () => {
			const result = getConnectionOptions({
				...commonOptions,
				authentication: 'password',
				username: 'test-username',
				password: 'test-password',
			});

			expect(result).toEqual({
				...commonOptions,
				username: 'test-username',
				password: 'test-password',
			});
		});

		it('without origin hostname when not provided', () => {
			const result = getConnectionOptions({
				...commonOptions,
				authentication: 'password',
				username: 'test-username',
				password: 'test-password',
			});

			expect(result).not.toHaveProperty('host');
			expect(result).toEqual({
				...commonOptions,
				username: 'test-username',
				password: 'test-password',
			});
		});

		it('without origin hostname when only whitespace is provided', () => {
			const result = getConnectionOptions({
				...commonOptions,
				host: '   ',
				authentication: 'password',
				username: 'test-username',
				password: 'test-password',
			});

			expect(result).not.toHaveProperty('host');
			expect(result).toEqual({
				...commonOptions,
				username: 'test-username',
				password: 'test-password',
			});
		});

		it('with optional origin hostname when provided', () => {
			const result = getConnectionOptions({
				...commonOptions,
				host: 'acme-org.us-east-1.snowflakecomputing.com',
				authentication: 'password',
				username: 'test-username',
				password: 'test-password',
			});

			expect(result).toEqual({
				...commonOptions,
				host: 'acme-org.us-east-1.snowflakecomputing.com',
				username: 'test-username',
				password: 'test-password',
			});
		});

		it('with private key for keyPair authentication', () => {
			const result = getConnectionOptions({
				...commonOptions,
				username: 'test-username',
				authentication: 'keyPair',
				privateKey: 'test-private-key',
			});

			expect(result).toEqual({
				...commonOptions,
				username: 'test-username',
				authenticator: 'SNOWFLAKE_JWT',
				privateKey: 'test-private-key',
			});
		});

		it('with oauth token for oauth2 authentication', () => {
			const result = getConnectionOptions({
				...commonOptions,
				authentication: 'oauth2',
				token: 'test-oauth-token',
			});

			expect(result).toEqual({
				...commonOptions,
				authenticator: 'OAUTH',
				token: 'test-oauth-token',
			});
		});

		it('with private key for keyPair authentication and passphrase', () => {
			const createPrivateKeySpy = vi.spyOn(crypto, 'createPrivateKey').mockImplementation(
				() =>
					({
						export: () => 'test-private-key',
					}) as unknown as crypto.KeyObject,
			);
			const result = getConnectionOptions({
				...commonOptions,
				username: 'test-username',
				authentication: 'keyPair',
				privateKey: 'encrypted-private-key',
				passphrase: 'test-passphrase',
			});

			expect(createPrivateKeySpy).toHaveBeenCalledWith({
				key: 'encrypted-private-key',
				format: 'pem',
				passphrase: 'test-passphrase',
			});

			expect(result).toEqual({
				...commonOptions,
				username: 'test-username',
				authenticator: 'SNOWFLAKE_JWT',
				privateKey: 'test-private-key',
			});
		});
	});
});

describe('prepareQueryResults', () => {
	const constructExecutionMetaData = vi
		.fn()
		.mockImplementation((data: INodeExecutionData[]) => data);
	const returnJsonArray = vi
		.fn()
		.mockImplementation((data: IDataObject | IDataObject[]) =>
			(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		);
	const prepareBinaryData = vi.fn(async (buffer: Buffer, fileName?: string) => ({
		data: buffer.toString('base64'),
		fileName,
		mimeType: 'application/octet-stream',
	}));
	const context = {
		helpers: { constructExecutionMetaData, returnJsonArray, prepareBinaryData },
	} as unknown as IExecuteFunctions;

	it('should move binary columns to the binary output on version 1.1', async () => {
		const blob = Buffer.from('file-bytes');

		const result = await prepareQueryResults.call(context, [{ ID: 1, DOC: blob }], 0, 1.1);

		expect(result[0].json).toEqual({ ID: 1 });
		expect(prepareBinaryData).toHaveBeenCalledWith(blob, 'DOC');
		expect(result[0].binary?.DOC).toBeDefined();
	});

	it('should keep binary columns in json before version 1.1', async () => {
		const blob = Buffer.from('file-bytes');

		const result = await prepareQueryResults.call(context, [{ ID: 1, DOC: blob }], 0, 1);

		expect(result[0].json.DOC).toBe(blob);
		expect(result[0].binary).toBeUndefined();
	});

	it('should return no items for undefined rows on version 1.1', async () => {
		const result = await prepareQueryResults.call(context, undefined, 0, 1.1);

		expect(result).toEqual([]);
	});
});

describe('SDK error wrapping', () => {
	const node = mock<INode>({ typeVersion: 1.1 });
	let conn: MockProxy<snowflake.Connection>;
	const credential: SnowflakeCredential = {
		account: 'test-account',
		authentication: 'password',
		username: 'test-username',
		password: 'test-password',
	};
	const sdkError = Object.assign(new Error('SQL compilation error: Object does not exist'), {
		name: 'OperationFailedError',
		sqlState: '42S02',
	}) as snowflake.SnowflakeError;

	beforeEach(() => {
		conn = mock<snowflake.Connection>();
		vi.spyOn(snowflake, 'createConnection').mockReturnValue(conn);
	});

	it('should reject with a NodeOperationError when the statement fails', async () => {
		conn.execute.mockImplementation(({ complete }) => {
			complete?.(sdkError, mock(), undefined);
			return mock();
		});

		await expect(execute(conn, 'SELECT 1', [], node, 2)).rejects.toMatchObject({
			name: 'NodeOperationError',
			message: sdkError.message,
			cause: sdkError,
			context: expect.objectContaining({ itemIndex: 2 }),
			level: 'warning',
		});
	});

	it('should wrap an error that the SDK throws synchronously', async () => {
		const bindError = Object.assign(new Error('Invalid binds'), { name: 'InvalidParameterError' });
		conn.execute.mockImplementation(() => {
			throw bindError;
		});

		await expect(execute(conn, 'UPDATE T SET A = ?', [], node, 1)).rejects.toMatchObject({
			name: 'NodeOperationError',
			cause: bindError,
			context: expect.objectContaining({ itemIndex: 1 }),
		});
	});

	it('should reject with a NodeOperationError when connection setup throws', async () => {
		const setupError = Object.assign(new Error('A user name must be specified.'), {
			name: 'MissingParameterError',
		});
		vi.mocked(snowflake.createConnection).mockImplementation(() => {
			throw setupError;
		});

		await expect(connect(credential, node)).rejects.toMatchObject({
			name: 'NodeOperationError',
			cause: setupError,
		});
	});

	it.each([
		['connect', async () => await connect(credential, node)],
		['destroy', async () => await destroy(conn, node)],
	] as const)('should reject with a NodeOperationError when %s fails', async (method, run) => {
		conn[method].mockImplementation((callback) => {
			callback?.(sdkError, conn);
			return conn;
		});

		await expect(run()).rejects.toMatchObject({ name: 'NodeOperationError', cause: sdkError });
	});
});
