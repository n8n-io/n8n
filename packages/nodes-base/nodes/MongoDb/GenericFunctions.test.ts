import type { INode, IExecuteFunctions } from 'n8n-workflow';
import { Binary, ObjectId } from 'mongodb';

import { prepareItems, serializeMongoItems } from './GenericFunctions';

const mockNode = { name: 'MongoDB', type: 'n8n-nodes-base.mongoDb' } as INode;

describe('MongoDB Node: Generic Functions', () => {
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

			it('accepts number, boolean, and null updateKey values', () => {
				const items = [
					{ json: { id: 1, value: 'a' } },
					{ json: { id: true, value: 'b' } },
					{ json: { id: null, value: 'c' } },
				];
				const args = { items, fields: ['value'], updateKey: 'id', node: mockNode };

				expect(() => prepareItems(args)).not.toThrow();
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
