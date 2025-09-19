import type {
	ICollaborator,
	IDtableMetadataColumn,
	IRow,
	IRowObject,
	IColumnDigitalSignature,
} from '../../v2/actions/Interfaces';
import {
	enrichColumns,
	rowExport,
	simplify_new,
	splitStringColumnsToArrays,
} from '../../v2/GenericFunctions';
import type { TDtableMetadataColumns } from '../../v2/types';

describe('Seatable > v2 > GenericFunctions', () => {
	describe('rowExport', () => {
		const mockColumns: TDtableMetadataColumns = [
			{ key: 'a', name: 'id', type: 'text' },
			{ key: 'b', name: 'name', type: 'text' },
			{ key: 'c', name: 'age', type: 'number' },
		];

		it('should export only allowed columns from row', () => {
			const row: IRowObject = {
				id: '1',
				name: 'John',
				age: 30,
				extraField: 'should not be included',
			};

			const expected: IRowObject = {
				id: '1',
				name: 'John',
				age: 30,
			};

			expect(rowExport(row, mockColumns)).toEqual(expected);
		});

		it('should handle empty row', () => {
			const row: IRowObject = {};
			expect(rowExport(row, mockColumns)).toEqual({});
		});

		it('should handle row with missing fields', () => {
			const row: IRowObject = {
				id: '1',
				// name is missing
				age: 30,
			};

			const expected: IRowObject = {
				id: '1',
				age: 30,
			};

			expect(rowExport(row, mockColumns)).toEqual(expected);
		});
	});

	describe('splitStringColumnsToArrays', () => {
		it('should convert collaborator strings to arrays', () => {
			const columns: TDtableMetadataColumns = [
				{ key: 'a', name: 'collaborators', type: 'collaborator' },
			];
			const row: IRowObject = {
				collaborators: 'john@example.com, jane@example.com',
			};

			const result = splitStringColumnsToArrays(row, columns);
			expect(result.collaborators).toEqual(['john@example.com', 'jane@example.com']);
		});

		it('should convert multiple-select strings to arrays', () => {
			const columns: TDtableMetadataColumns = [{ key: 'a', name: 'tags', type: 'multiple-select' }];
			const row: IRowObject = {
				tags: 'urgent, important',
			};

			const result = splitStringColumnsToArrays(row, columns);
			expect(result.tags).toEqual(['urgent', 'important']);
		});

		it('should convert number strings to numbers', () => {
			const columns: TDtableMetadataColumns = [{ key: 'a', name: 'amount', type: 'number' }];
			const row: IRowObject = {
				amount: '123.45',
			};

			const result = splitStringColumnsToArrays(row, columns);
			expect(result.amount).toBe(123.45);
		});

		it('should convert rate and duration strings to integers', () => {
			const columns: TDtableMetadataColumns = [
				{ key: 'a', name: 'rating', type: 'rate' },
				{ key: 'b', name: 'duration', type: 'duration' },
			];
			const row: IRowObject = {
				rating: '4',
				duration: '60',
			};

			const result = splitStringColumnsToArrays(row, columns);
			expect(result.rating).toBe(4);
			expect(result.duration).toBe(60);
		});

		it('should convert checkbox strings to booleans', () => {
			const columns: TDtableMetadataColumns = [{ key: 'a', name: 'isActive', type: 'checkbox' }];
			const testCases = [
				{ input: 'true', expected: true },
				{ input: 'on', expected: true },
				{ input: '1', expected: true },
				{ input: 'false', expected: false },
				{ input: 'off', expected: false },
				{ input: '0', expected: false },
			];

			testCases.forEach(({ input, expected }) => {
				const row: IRowObject = { isActive: input };
				const result = splitStringColumnsToArrays(row, columns);
				expect(result.isActive).toBe(expected);
			});
		});

		it('should handle multiple column types in one row', () => {
			const columns: TDtableMetadataColumns = [
				{ key: 'a', name: 'tags', type: 'multiple-select' },
				{ key: 'b', name: 'amount', type: 'number' },
				{ key: 'c', name: 'isActive', type: 'checkbox' },
			];
			const row: IRowObject = {
				tags: 'tag1, tag2',
				amount: '123.45',
				isActive: 'true',
			};

			const result = splitStringColumnsToArrays(row, columns);
			expect(result).toEqual({
				tags: ['tag1', 'tag2'],
				amount: 123.45,
				isActive: true,
			});
		});

		it('should handle empty/invalid inputs', () => {
			const columns: TDtableMetadataColumns = [
				{ key: 'a', name: 'empty', type: 'multiple-select' },
				{ key: 'b', name: 'invalid', type: 'number' },
			];
			const row: IRowObject = {
				empty: '',
				invalid: 'not-a-number',
			};

			const result = splitStringColumnsToArrays(row, columns);
			expect(result.empty).toEqual(['']);
			expect(result.invalid).toBeNaN();
		});
	});

	describe('enrichColumns', () => {
		const baseRow = {
			_id: '1234',
			_ctime: '2024-01-01T00:00:00Z',
			_mtime: '2024-01-01T00:00:00Z',
		};

		const mockCollaborators: ICollaborator[] = [
			{
				name: 'John Doe',
				email: 'john@example.com',
				contact_email: 'john@example.com',
			},
			{
				name: 'Jane Smith',
				email: 'jane@example.com',
				contact_email: 'jane@example.com',
			},
		];

		const mockMetadata: IDtableMetadataColumn[] = [
			{ name: 'assignee', type: 'collaborator', key: 'assignee' },
			{ name: 'creator', type: 'creator', key: '_creator' },
			{ name: 'lastModifier', type: 'last-modifier', key: '_last_modifier' },
			{ name: 'images', type: 'image', key: 'images' },
			{ name: 'files', type: 'file', key: 'files' },
			{ name: 'signature', type: 'digital-sign', key: 'signature' },
			{ name: 'action', type: 'button', key: 'action' },
		];

		it('should preserve base IRow properties', () => {
			const row: IRow = {
				...baseRow,
				assignee: ['john@example.com'],
			};

			const result = enrichColumns(row, mockMetadata, mockCollaborators);
			expect(result._id).toBe(baseRow._id);
			expect(result._ctime).toBe(baseRow._ctime);
			expect(result._mtime).toBe(baseRow._mtime);
		});

		it('should enrich collaborator columns', () => {
			const row: IRow = {
				...baseRow,
				assignee: ['john@example.com'],
			};

			const result = enrichColumns(row, mockMetadata, mockCollaborators);
			expect(result.assignee).toEqual([
				{
					email: 'john@example.com',
					contact_email: 'john@example.com',
					name: 'John Doe',
				},
			]);
		});

		it('should enrich creator and last-modifier columns', () => {
			const row: IRow = {
				...baseRow,
				creator: 'john@example.com',
				lastModifier: 'jane@example.com',
			};

			const result = enrichColumns(row, mockMetadata, mockCollaborators);
			expect(result.creator).toEqual({
				email: 'john@example.com',
				contact_email: 'john@example.com',
				name: 'John Doe',
			});
		});

		it('should enrich image columns', () => {
			const row: IRow = {
				...baseRow,
				images: ['https://example.com/image.jpg'],
			};

			const result = enrichColumns(row, mockMetadata, mockCollaborators);
			expect(result.images).toEqual([
				{
					name: 'image.jpg',
					size: 0,
					type: 'image',
					url: 'https://example.com/image.jpg',
					path: 'https://example.com/image.jpg',
				},
			]);
		});

		it('should handle empty/missing data gracefully', () => {
			const row: IRow = {
				...baseRow,
				assignee: [],
				images: [],
				files: [],
				signature: {} as IColumnDigitalSignature,
			};

			const result = enrichColumns(row, mockMetadata, mockCollaborators);
			expect(result.assignee).toEqual([]);
			expect(result.images).toEqual([]);
			expect(result.files).toEqual([]);
			expect(result.signature).toEqual({});
		});
	});

	describe('simplify_new', () => {
		it('should remove keys starting with underscore', () => {
			const input: IRow = {
				_id: '123',
				_ctime: '2024-01-01',
				_mtime: '2024-01-01',
				name: 'Test',
				value: 42,
			};

			const expected = {
				name: 'Test',
				value: 42,
			};

			expect(simplify_new(input)).toEqual(expected);
		});

		it('should handle empty object', () => {
			const input: IRow = {
				_id: '123',
				_ctime: '2024-01-01',
				_mtime: '2024-01-01',
			};

			expect(simplify_new(input)).toEqual({});
		});

		it('should preserve non-underscore keys', () => {
			const input: IRow = {
				_id: '123',
				_ctime: '2024-01-01',
				_mtime: '2024-01-01',
				normal_key: 'value',
				dash_key: 'value',
			};

			const expected = {
				normal_key: 'value',
				dash_key: 'value',
			};

			expect(simplify_new(input)).toEqual(expected);
		});
	});
});
