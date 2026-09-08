import { enrichColumns, escapeSqlIdentifier, escapeSqlString, rowExport, simplify_new, splitStringColumnsToArrays, } from '../../v2/GenericFunctions';
describe('Seatable > v2 > GenericFunctions', () => {
    describe('escapeSqlIdentifier', () => {
        it('should escape backticks by doubling them', () => {
            expect(escapeSqlIdentifier('table`name')).toBe('table``name');
        });
        it('should escape multiple backticks', () => {
            expect(escapeSqlIdentifier('a`b`c')).toBe('a``b``c');
        });
        it('should leave safe identifiers unchanged', () => {
            expect(escapeSqlIdentifier('Employees')).toBe('Employees');
            expect(escapeSqlIdentifier('my_table')).toBe('my_table');
        });
        it('should handle empty string', () => {
            expect(escapeSqlIdentifier('')).toBe('');
        });
    });
    describe('escapeSqlString', () => {
        it('should escape double quotes', () => {
            expect(escapeSqlString('" OR 1=1 OR "')).toBe('\\" OR 1=1 OR \\"');
        });
        it('should escape single quotes', () => {
            expect(escapeSqlString("' OR 1=1 --")).toBe("\\' OR 1=1 --");
        });
        it('should escape backslashes', () => {
            expect(escapeSqlString('back\\slash')).toBe('back\\\\slash');
        });
        it('should escape backslash before quote to prevent double-escaping bypass', () => {
            expect(escapeSqlString("\\' OR 1=1 --")).toBe("\\\\\\' OR 1=1 --");
        });
        it('should leave safe strings unchanged', () => {
            expect(escapeSqlString('admin')).toBe('admin');
            expect(escapeSqlString('hello world')).toBe('hello world');
            expect(escapeSqlString('user@example.com')).toBe('user@example.com');
        });
        it('should handle empty string', () => {
            expect(escapeSqlString('')).toBe('');
        });
    });
    describe('rowExport', () => {
        const mockColumns = [
            { key: 'a', name: 'id', type: 'text' },
            { key: 'b', name: 'name', type: 'text' },
            { key: 'c', name: 'age', type: 'number' },
        ];
        it('should export only allowed columns from row', () => {
            const row = {
                id: '1',
                name: 'John',
                age: 30,
                extraField: 'should not be included',
            };
            const expected = {
                id: '1',
                name: 'John',
                age: 30,
            };
            expect(rowExport(row, mockColumns)).toEqual(expected);
        });
        it('should handle empty row', () => {
            const row = {};
            expect(rowExport(row, mockColumns)).toEqual({});
        });
        it('should handle row with missing fields', () => {
            const row = {
                id: '1',
                // name is missing
                age: 30,
            };
            const expected = {
                id: '1',
                age: 30,
            };
            expect(rowExport(row, mockColumns)).toEqual(expected);
        });
    });
    describe('splitStringColumnsToArrays', () => {
        it('should convert collaborator strings to arrays', () => {
            const columns = [
                { key: 'a', name: 'collaborators', type: 'collaborator' },
            ];
            const row = {
                collaborators: 'john@example.com, jane@example.com',
            };
            const result = splitStringColumnsToArrays(row, columns);
            expect(result.collaborators).toEqual(['john@example.com', 'jane@example.com']);
        });
        it('should convert multiple-select strings to arrays', () => {
            const columns = [{ key: 'a', name: 'tags', type: 'multiple-select' }];
            const row = {
                tags: 'urgent, important',
            };
            const result = splitStringColumnsToArrays(row, columns);
            expect(result.tags).toEqual(['urgent', 'important']);
        });
        it('should convert number strings to numbers', () => {
            const columns = [{ key: 'a', name: 'amount', type: 'number' }];
            const row = {
                amount: '123.45',
            };
            const result = splitStringColumnsToArrays(row, columns);
            expect(result.amount).toBe(123.45);
        });
        it('should convert rate and duration strings to integers', () => {
            const columns = [
                { key: 'a', name: 'rating', type: 'rate' },
                { key: 'b', name: 'duration', type: 'duration' },
            ];
            const row = {
                rating: '4',
                duration: '60',
            };
            const result = splitStringColumnsToArrays(row, columns);
            expect(result.rating).toBe(4);
            expect(result.duration).toBe(60);
        });
        it('should convert checkbox strings to booleans', () => {
            const columns = [{ key: 'a', name: 'isActive', type: 'checkbox' }];
            const testCases = [
                { input: 'true', expected: true },
                { input: 'on', expected: true },
                { input: '1', expected: true },
                { input: 'false', expected: false },
                { input: 'off', expected: false },
                { input: '0', expected: false },
            ];
            testCases.forEach(({ input, expected }) => {
                const row = { isActive: input };
                const result = splitStringColumnsToArrays(row, columns);
                expect(result.isActive).toBe(expected);
            });
        });
        it('should handle multiple column types in one row', () => {
            const columns = [
                { key: 'a', name: 'tags', type: 'multiple-select' },
                { key: 'b', name: 'amount', type: 'number' },
                { key: 'c', name: 'isActive', type: 'checkbox' },
            ];
            const row = {
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
            const columns = [
                { key: 'a', name: 'empty', type: 'multiple-select' },
                { key: 'b', name: 'invalid', type: 'number' },
            ];
            const row = {
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
        const mockCollaborators = [
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
        const mockMetadata = [
            { name: 'assignee', type: 'collaborator', key: 'assignee' },
            { name: 'creator', type: 'creator', key: '_creator' },
            { name: 'lastModifier', type: 'last-modifier', key: '_last_modifier' },
            { name: 'images', type: 'image', key: 'images' },
            { name: 'files', type: 'file', key: 'files' },
            { name: 'signature', type: 'digital-sign', key: 'signature' },
            { name: 'action', type: 'button', key: 'action' },
        ];
        it('should preserve base IRow properties', () => {
            const row = {
                ...baseRow,
                assignee: ['john@example.com'],
            };
            const result = enrichColumns(row, mockMetadata, mockCollaborators);
            expect(result._id).toBe(baseRow._id);
            expect(result._ctime).toBe(baseRow._ctime);
            expect(result._mtime).toBe(baseRow._mtime);
        });
        it('should enrich collaborator columns', () => {
            const row = {
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
            const row = {
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
            const row = {
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
            const row = {
                ...baseRow,
                assignee: [],
                images: [],
                files: [],
                signature: {},
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
            const input = {
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
            const input = {
                _id: '123',
                _ctime: '2024-01-01',
                _mtime: '2024-01-01',
            };
            expect(simplify_new(input)).toEqual({});
        });
        it('should preserve non-underscore keys', () => {
            const input = {
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
//# sourceMappingURL=GenericFunctions.test.js.map