import { ObjectId } from 'mongodb';
import type { INode } from 'n8n-workflow';

import {
	buildParameterizedConnString,
	buildUpdateFilter,
	prepareItems,
	sanitizeMongoUriInMessage,
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

		it.each([
			['null', null],
			['an object', { $ne: 'x' }],
			['an array', ['a']],
		])('rejects %s as an update key value', (_label, value) => {
			expect(() =>
				prepareItems({
					items: [{ json: { id: value, name: 'Alice' } }],
					fields: ['name'],
					updateKey: 'id',
					node: mockNode,
				}),
			).toThrow(/must be a string, number, boolean, or date/);
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
		it('rejects an empty update key', () => {
			expect(() => buildUpdateFilter(mockNode, { id: 'a-1' }, '')).toThrow(
				'The Update Key must not be empty',
			);
		});

		it('rejects an operator as the update key', () => {
			expect(() => buildUpdateFilter(mockNode, { $expr: true }, '$expr')).toThrow(
				'The Update Key must not start with "$"',
			);
		});

		it('reads a dotted update key from the prepared item', () => {
			expect(buildUpdateFilter(mockNode, { user: { id: 'u-1' } }, 'user.id')).toEqual({
				'user.id': 'u-1',
			});
		});

		it('converts a valid _id string to an ObjectId', () => {
			const id = '662a2b1a2f8b9c0d1e2f3a4b';

			expect(buildUpdateFilter(mockNode, { _id: id }, '_id')).toEqual({ _id: new ObjectId(id) });
		});

		it('rejects an invalid _id string', () => {
			expect(() => buildUpdateFilter(mockNode, { _id: 'invalid' }, '_id')).toThrow(
				'The value of "_id" must be a valid ObjectId string',
			);
		});
	});
});
