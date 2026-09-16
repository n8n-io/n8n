import {
	getMappingColumns,
	getMappingColumnsWithRowId,
	getTableColumns,
} from '../../GenericFunctions';
import { createLoadOptionsFunctions } from './helpers';

const table = {
	docId: { __rl: true, mode: 'list', value: 'doc1' },
	tableId: { __rl: true, mode: 'list', value: 'People' },
};

describe('Grist Node', () => {
	describe('Resource mapping', () => {
		const request = vi.fn();

		beforeEach(() => {
			request.mockReset();
		});

		const mapColumns = async (columns: unknown[]) => {
			request.mockResolvedValue({ columns });
			const { fields } = await getMappingColumns.call(createLoadOptionsFunctions(table, request));
			return fields;
		};

		it('should map Grist column types to field types', async () => {
			const fields = await mapColumns([
				{ id: 'aText', fields: { type: 'Text' } },
				{ id: 'anInt', fields: { type: 'Int' } },
				{ id: 'aBool', fields: { type: 'Bool' } },
				{ id: 'aDateTime', fields: { type: 'DateTime:America/New_York' } },
				{ id: 'aRefList', fields: { type: 'RefList:Orders' } },
			]);

			expect(Object.fromEntries(fields.map((field) => [field.id, field.type]))).toEqual({
				aText: 'string',
				anInt: 'number',
				aBool: 'boolean',
				aDateTime: 'dateTime',
				aRefList: 'array',
			});
		});

		it('should offer the choices of a Choice column', async () => {
			const fields = await mapColumns([
				{
					id: 'Status',
					fields: { type: 'Choice', widgetOptions: '{"choices":["Lead","Customer"]}' },
				},
			]);

			expect(fields[0]).toMatchObject({
				type: 'options',
				options: [
					{ name: 'Lead', value: 'Lead' },
					{ name: 'Customer', value: 'Customer' },
				],
			});
		});

		it('should keep a Choice column with no usable choices as free text', async () => {
			const fields = await mapColumns([
				{ id: 'NoChoices', fields: { type: 'Choice', widgetOptions: '{"choices":[]}' } },
				{ id: 'BadOptions', fields: { type: 'Choice', widgetOptions: '{' } },
				{ id: 'NoWidgetOptions', fields: { type: 'Choice' } },
				{ id: 'NotStrings', fields: { type: 'Choice', widgetOptions: '{"choices":[1,2]}' } },
				{ id: 'NullOptions', fields: { type: 'Choice', widgetOptions: 'null' } },
			]);

			expect(fields.map(({ type, options }) => ({ type, options }))).toEqual([
				{ type: 'string', options: undefined },
				{ type: 'string', options: undefined },
				{ type: 'string', options: undefined },
				{ type: 'string', options: undefined },
				{ type: 'string', options: undefined },
			]);
		});

		it('should not give a ChoiceList column a dropdown', async () => {
			const fields = await mapColumns([
				{ id: 'Tags', fields: { type: 'ChoiceList', widgetOptions: '{"choices":["vip"]}' } },
			]);

			expect(fields[0]).toMatchObject({ type: 'array', options: undefined });
		});

		it('should make formula columns read-only and remove them by default', async () => {
			const fields = await mapColumns([
				{ id: 'Formula', fields: { type: 'Text', isFormula: true, formula: '$First' } },
				// A new, empty column reports isFormula with no formula.
				{ id: 'Empty', fields: { type: 'Any', isFormula: true, formula: '' } },
				{ id: 'Trigger', fields: { type: 'Text', isFormula: false, formula: 'NOW()' } },
			]);

			expect(fields.map(({ id, readOnly, removed }) => ({ id, readOnly, removed }))).toEqual([
				{ id: 'Formula', readOnly: true, removed: true },
				{ id: 'Empty', readOnly: false, removed: false },
				{ id: 'Trigger', readOnly: false, removed: false },
			]);
		});

		it('should label a column by its Grist label, or by its ID, in the mapper and the picker', async () => {
			request.mockResolvedValue({
				columns: [
					{ id: 'FullName', fields: { label: 'Full Name', type: 'Text' } },
					{ id: 'NoLabel', fields: { type: 'Text' } },
				],
			});

			const { fields } = await getMappingColumns.call(createLoadOptionsFunctions(table, request));
			const options = await getTableColumns.call(createLoadOptionsFunctions(table, request));

			expect(fields.map(({ displayName }) => displayName)).toEqual(['Full Name', 'NoLabel']);
			expect(options).toEqual([
				{ name: 'Full Name', value: 'FullName' },
				{ name: 'NoLabel', value: 'NoLabel' },
			]);
		});

		it('should add the row ID as the default column to match on', async () => {
			request.mockResolvedValue({ columns: [{ id: 'Email', fields: { type: 'Text' } }] });

			const { fields } = await getMappingColumnsWithRowId.call(
				createLoadOptionsFunctions(table, request),
			);

			expect(
				fields.map(({ id, defaultMatch, canBeUsedToMatch, readOnly }) => ({
					id,
					defaultMatch,
					canBeUsedToMatch,
					readOnly,
				})),
			).toEqual([
				{ id: 'id', defaultMatch: true, canBeUsedToMatch: true, readOnly: true },
				{ id: 'Email', defaultMatch: false, canBeUsedToMatch: true, readOnly: false },
			]);
		});

		it('should not make a request until a document and table are selected', async () => {
			const { fields } = await getMappingColumns.call(
				createLoadOptionsFunctions({ docId: 'doc1', tableId: '' }, request),
			);

			expect(fields).toEqual([]);
			expect(request).not.toHaveBeenCalled();
		});
	});
});
