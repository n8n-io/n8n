import { Binary, ObjectId } from 'mongodb';
import type { INode, IExecuteFunctions } from 'n8n-workflow';

import {
	buildParameterizedConnString,
	buildUpdateFilter,
	prepareItems,
	sanitizeMongoUriInMessage,
	serializeMongoItems,
} from './GenericFunctions';

const mockNode = { name: 'MongoDB', type: 'n8n-nodes-base.mongoDb' } as INode;

describe('MongoDB Node: Generic Functions', () => {
	describe('buildParameterizedConnString', () => {
		it('trims user and host values', () => {
			const connectionString = buildParameterizedConnString({
				configurationType: 'values',
				host: '  localhost  ',
				database: 'database',
				user: '  user  ',
				password: ' password ',
				port: 27017,
			});

			expect(connectionString).toBe('mongodb://user: password @localhost:27017');
		});

		it('keeps values without surrounding whitespace unchanged', () => {
			const connectionString = buildParameterizedConnString({
				configurationType: 'values',
				host: 'localhost',
				database: 'database',
				user: 'user',
				password: 'password',
				port: 27017,
			});

			expect(connectionString).toBe('mongodb://user:password@localhost:27017');
		});
	});

	describe('sanitizeMongoUriInMessage', () => {
		describe('when replacing the supplied connection string', () => {
			it('redacts repeated occurrences', () => {
				const connectionString = 'mongodb://user:password@host:27017/db';
				const message = `tried ${connectionString} then retried ${connectionString}`;

				expect(sanitizeMongoUriInMessage(message, connectionString)).toBe(
					'tried mongodb://[REDACTED] then retried mongodb://[REDACTED]',
				);
			});

			it('redacts the connection string when the regex does not match', () => {
				const connectionString = 'mongodb://user\nsecret@host:27017/db';
				const message = `Invalid URL: ${connectionString}`;

				expect(sanitizeMongoUriInMessage(message, connectionString)).toBe(
					'Invalid URL: mongodb://[REDACTED]',
				);
			});

			it('is idempotent', () => {
				const connectionString = 'mongodb://user:password@host:27017/db';
				const message = `Invalid URL: ${connectionString}`;
				const sanitized = sanitizeMongoUriInMessage(message, connectionString);

				expect(sanitizeMongoUriInMessage(sanitized, connectionString)).toBe(sanitized);
			});
		});

		describe('when matching MongoDB URIs with the regex', () => {
			it.each([
				[
					'Invalid URL: mongodb://leaky_user:supersecret@:27017/?appname=n8n',
					'Invalid URL: mongodb://[REDACTED]',
				],
				[
					'connect failed: mongodb+srv://user:password@cluster.example.net/db',
					'connect failed: mongodb+srv://[REDACTED]',
				],
				[
					'connect failed: mongodb://%41%42%43:%44%45%46@host:27017/db',
					'connect failed: mongodb://[REDACTED]',
				],
				['Invalid URL: mongodb://user/secret@host:27017/db', 'Invalid URL: mongodb://[REDACTED]'],
				['Invalid URL: mongodb://user:p@ss@host:27017/db', 'Invalid URL: mongodb://[REDACTED]'],
			])('redacts authentication from %s', (message, expected) => {
				expect(sanitizeMongoUriInMessage(message, '')).toBe(expected);
			});

			it('redacts multiple different URIs', () => {
				const message = 'tried mongodb://a:b@host1, then mongodb+srv://c:d@cluster, both failed';

				expect(sanitizeMongoUriInMessage(message, '')).toBe(
					'tried mongodb://[REDACTED] then mongodb+srv://[REDACTED] both failed',
				);
			});

			it('redacts repeated occurrences of the same URI', () => {
				const connectionString = 'mongodb://user:password@host:27017/db';
				const message = `tried ${connectionString} then retried ${connectionString}`;

				expect(sanitizeMongoUriInMessage(message, '')).toBe(
					'tried mongodb://[REDACTED] then retried mongodb://[REDACTED]',
				);
			});

			it.each([
				'connect ECONNREFUSED 127.0.0.1:27017',
				'connect failed: mongodb://host:27017/db',
				'',
			])('leaves messages without URI authentication unchanged', (message) => {
				expect(sanitizeMongoUriInMessage(message, '')).toBe(message);
			});
		});
	});

	describe('prepareItems', () => {
		it('should select fields', () => {
			const items = [{ json: { name: 'John', age: 30 } }, { json: { name: 'Jane', age: 25 } }];
			const fields = ['name'];

			const result = prepareItems({ items, fields, node: mockNode });

			expect(result).toEqual([{ name: 'John' }, { name: 'Jane' }]);
		});

		it('should add updateKey to selected fields', () => {
			const items = [{ json: { name: 'John', age: 30 } }, { json: { name: 'Jane', age: 25 } }];
			const fields = ['age'];
			const updateKey = 'name';

			const result = prepareItems({ items, fields, updateKey, node: mockNode });

			expect(result).toEqual([
				{ name: 'John', age: 30 },
				{ name: 'Jane', age: 25 },
			]);
		});

		it('should handle dot notation', () => {
			const items = [{ json: { user: { name: 'John' } } }, { json: { user: { name: 'Jane' } } }];
			const fields = ['user.name'];
			const useDotNotation = true;

			const result = prepareItems({
				items,
				fields,
				updateKey: '',
				useDotNotation,
				node: mockNode,
			});

			expect(result).toEqual([{ user: { name: 'John' } }, { user: { name: 'Jane' } }]);
		});

		it('should parse dates', () => {
			const items = [
				{ json: { date: '2023-10-01T00:00:00Z' } },
				{ json: { date: '2023-10-02T00:00:00Z' } },
			];
			const fields = ['date'];
			const dateFields = ['date'];
			const useDotNotation = false;
			const isUpdate = false;
			const result = prepareItems({
				items,
				fields,
				updateKey: '',
				useDotNotation,
				dateFields,
				isUpdate,
				node: mockNode,
			});
			expect(result).toEqual([
				{ date: new Date('2023-10-01T00:00:00Z') },
				{ date: new Date('2023-10-02T00:00:00Z') },
			]);
		});

		describe('updateKey value validation', () => {
			it('throws when the updateKey value is a plain object', () => {
				const items = [{ json: { id: { $regex: '^a' }, value: 'x' } }];
				const args = { items, fields: ['value'], updateKey: 'id', node: mockNode };

				expect(() => prepareItems(args)).toThrow(/must be a string, number, boolean, or date/);
			});

			it('throws when the updateKey value is an array', () => {
				const items = [{ json: { id: ['a', 'b'], value: 'x' } }];
				const args = { items, fields: ['value'], updateKey: 'id', node: mockNode };

				expect(() => prepareItems(args)).toThrow();
			});

			it('drops items where useDotNotation would resolve the updateKey to a non-scalar', () => {
				// The data-filter step in prepareItems uses bracket access on the dotted key,
				// so items whose dot path resolves to an object are excluded before the map loop
				// runs. No operator-shaped value reaches the driver.
				const items = [{ json: { user: { id: { $gt: 1 } }, value: 'x' } }];
				const args = {
					items,
					fields: ['value'],
					updateKey: 'user.id',
					useDotNotation: true,
					node: mockNode,
				};

				const result = prepareItems(args);

				expect(result).toEqual([]);
			});

			it('passes a string updateKey value through unchanged even when its content looks like JSON', () => {
				const items = [{ json: { id: '{"$regex":"^a"}', value: 'x' } }];
				const args = { items, fields: ['value'], updateKey: 'id', node: mockNode };

				const result = prepareItems(args);

				expect(result).toEqual([{ id: '{"$regex":"^a"}', value: 'x' }]);
			});

			it('accepts number and boolean updateKey values', () => {
				const items = [{ json: { id: 1, value: 'a' } }, { json: { id: true, value: 'b' } }];
				const args = { items, fields: ['value'], updateKey: 'id', node: mockNode };

				expect(() => prepareItems(args)).not.toThrow();
			});

			it('throws when the updateKey value is null', () => {
				const items = [{ json: { id: null, value: 'c' } }];
				const args = { items, fields: ['value'], updateKey: 'id', node: mockNode };

				expect(() => prepareItems(args)).toThrow(/must be a string, number, boolean, or date/);
			});

			it('accepts Date updateKey values', () => {
				const items = [{ json: { id: new Date('2024-01-01'), value: 'a' } }];
				const args = { items, fields: ['value'], updateKey: 'id', node: mockNode };

				expect(() => prepareItems(args)).not.toThrow();
			});
		});

		it('should handle updates', () => {
			// Should keep dot notation in result to not overwrite the original values
			const items = [
				{ json: { id: 1, user: { name: 'John', age: 30 } } },
				{ json: { id: 2, user: { name: 'Jane', age: 25 } } },
			];
			const fields = ['user.name'];
			const useDotNotation = true;
			const isUpdate = true;
			const result = prepareItems({
				items,
				fields,
				updateKey: '',
				useDotNotation,
				dateFields: [],
				isUpdate,
				node: mockNode,
			});
			expect(result).toEqual([{ 'user.name': 'John' }, { 'user.name': 'Jane' }]);
		});
	});

	describe('buildUpdateFilter', () => {
		it('filters on the update key value', () => {
			expect(buildUpdateFilter(mockNode, { id: 'a-1', value: 'x' }, 'id')).toEqual({ id: 'a-1' });
		});

		it.each([
			['a number', 5],
			['a boolean', false],
			['a date', new Date('2024-01-01')],
		])('accepts %s as the match value', (_label, value) => {
			expect(buildUpdateFilter(mockNode, { id: value }, 'id')).toEqual({ id: value });
		});

		it.each([
			['null', null],
			['undefined', undefined],
			['an object', { $ne: 'x' }],
			['an array', ['a']],
		])('throws when the match value is %s', (_label, value) => {
			expect(() => buildUpdateFilter(mockNode, { id: value }, 'id')).toThrow(
				/must be a string, number, boolean, or date/,
			);
		});

		it('throws when the update key is empty', () => {
			expect(() => buildUpdateFilter(mockNode, { id: 'a-1' }, '')).toThrow(
				'The Update Key must not be empty',
			);
		});

		it.each(['$expr', '$comment', '$where', '$or'])(
			'throws when the update key is the operator %s',
			(updateKey) => {
				expect(() => buildUpdateFilter(mockNode, { [updateKey]: true }, updateKey)).toThrow(
					'The Update Key must not start with "$"',
				);
			},
		);

		it('allows a $ that is not at the start of the update key', () => {
			expect(buildUpdateFilter(mockNode, { price$: 5 }, 'price$')).toEqual({ price$: 5 });
		});

		it('reads the value from the nested item that useDotNotation builds', () => {
			expect(buildUpdateFilter(mockNode, { user: { id: 'u-1' } }, 'user.id')).toEqual({
				'user.id': 'u-1',
			});
		});

		it('reads the value from a flat dotted key', () => {
			expect(buildUpdateFilter(mockNode, { 'user.id': 'u-1' }, 'user.id')).toEqual({
				'user.id': 'u-1',
			});
		});

		it('throws when a dotted update key resolves to nothing', () => {
			expect(() => buildUpdateFilter(mockNode, { value: 'x' }, 'user.id')).toThrow(
				/must be a string, number, boolean, or date/,
			);
		});

		it('converts an _id string to an ObjectId', () => {
			const id = '662a2b1a2f8b9c0d1e2f3a4b';

			expect(buildUpdateFilter(mockNode, { _id: id }, '_id')).toEqual({ _id: new ObjectId(id) });
		});

		it.each([
			['a number', 123],
			['an invalid string', 'not-an-object-id'],
		])('throws when the _id value is %s', (_label, value) => {
			expect(() => buildUpdateFilter(mockNode, { _id: value }, '_id')).toThrow(
				'The value of "_id" must be a valid ObjectId string',
			);
		});

		it('throws when the update key names a prototype property', () => {
			expect(() => buildUpdateFilter(mockNode, { value: 'x' }, '__proto__')).toThrow(
				/must be a string, number, boolean, or date/,
			);
		});
	});

	describe('serializeMongoItems', () => {
		const prepareBinaryData = vi.fn(async (buffer: Buffer, fileName?: string) => ({
			data: buffer.toString('base64'),
			fileName,
			mimeType: 'application/octet-stream',
		}));
		const thisArg = {
			helpers: { prepareBinaryData },
		} as unknown as IExecuteFunctions;

		it('should stringify nested ObjectIds and Dates to JSON-safe values', async () => {
			const date = new Date('2020-01-01T12:00:00.000Z');
			const items = [
				{
					json: {
						_id: new ObjectId('507f1f77bcf86cd799439011'),
						createdAt: date,
						author: { ref: new ObjectId('507f191e810c19729de860ea'), joinedAt: date },
					},
				},
			];

			const result = await serializeMongoItems.call(thisArg, items);

			expect(result[0].json).toEqual({
				_id: '507f1f77bcf86cd799439011',
				createdAt: '2020-01-01T12:00:00.000Z',
				author: {
					ref: '507f191e810c19729de860ea',
					joinedAt: '2020-01-01T12:00:00.000Z',
				},
			});
		});

		it('should move top-level binary fields to the binary output and remove them from json', async () => {
			const items = [
				{
					json: {
						_id: new ObjectId('507f1f77bcf86cd799439011'),
						avatar: new Binary(Buffer.from('image-bytes')),
					},
				},
			];

			const result = await serializeMongoItems.call(thisArg, items);

			expect(result[0].json).toEqual({ _id: '507f1f77bcf86cd799439011' });
			expect(result[0].json).not.toHaveProperty('avatar');
			expect(prepareBinaryData).toHaveBeenCalledWith(Buffer.from('image-bytes'), 'avatar');
			expect(result[0].binary?.avatar).toBeDefined();
		});
	});
});
