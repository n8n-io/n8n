import { mockDeep } from 'jest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { mapPipedriveFieldType } from '../../../v2/helpers/customFields';
import { getCustomFieldsMappingColumns } from '../../../v2/methods/resourceMapping';

function makeLoadOptionsMock(currentResource: string | undefined) {
	const ctx = mockDeep<ILoadOptionsFunctions>();
	ctx.getCurrentNodeParameter.mockReturnValue(currentResource as string);
	ctx.getNodeParameter.mockReturnValue('apiToken');
	ctx.getNode.mockReturnValue({
		id: 'test-node-id',
		name: 'Pipedrive',
		type: 'n8n-nodes-base.pipedrive',
		typeVersion: 2,
		position: [0, 0],
		parameters: {},
	});
	return ctx;
}

function mockApiResponse(
	ctx: ReturnType<typeof makeLoadOptionsMock>,
	fields: Array<Record<string, unknown>>,
) {
	ctx.helpers.requestWithAuthentication.mockResolvedValue({
		success: true,
		data: fields,
		additional_data: {},
	});
}

describe('Pipedrive v2 Resource Mapping', () => {
	describe('getCustomFieldsMappingColumns', () => {
		it('returns empty fields with notice when resource is missing', async () => {
			const ctx = makeLoadOptionsMock(undefined);
			const result = await getCustomFieldsMappingColumns.call(ctx);

			expect(result.fields).toEqual([]);
			expect(result.emptyFieldsNotice).toContain('Select a resource');
			expect(ctx.helpers.requestWithAuthentication).not.toHaveBeenCalled();
		});

		it('returns empty fields with notice when resource is unsupported', async () => {
			const ctx = makeLoadOptionsMock('note');
			const result = await getCustomFieldsMappingColumns.call(ctx);

			expect(result.fields).toEqual([]);
			expect(result.emptyFieldsNotice).toBeDefined();
			expect(ctx.helpers.requestWithAuthentication).not.toHaveBeenCalled();
		});

		it('filters out built-in fields with is_custom_field=false', async () => {
			const ctx = makeLoadOptionsMock('deal');
			mockApiResponse(ctx, [
				{
					field_code: 'label',
					field_name: 'Label',
					field_type: 'set',
					is_custom_field: false,
				},
				{
					field_code: 'status',
					field_name: 'Status',
					field_type: 'enum',
					is_custom_field: false,
				},
				{
					field_code: 'abc123',
					field_name: 'My Custom Text',
					field_type: 'text',
					is_custom_field: true,
				},
			]);

			const result = await getCustomFieldsMappingColumns.call(ctx);

			expect(result.fields).toHaveLength(1);
			expect(result.fields[0]).toMatchObject({
				id: 'abc123',
				displayName: 'My Custom Text',
				type: 'string',
			});
		});

		it('maps deal custom fields with correct types', async () => {
			const ctx = makeLoadOptionsMock('deal');
			mockApiResponse(ctx, [
				{
					field_code: 'hex_text',
					field_name: 'Text Field',
					field_type: 'text',
					is_custom_field: true,
				},
				{
					field_code: 'hex_num',
					field_name: 'Number Field',
					field_type: 'double',
					is_custom_field: true,
				},
				{
					field_code: 'hex_bool',
					field_name: 'Active',
					field_type: 'boolean',
					is_custom_field: true,
				},
				{
					field_code: 'hex_date',
					field_name: 'Due Date',
					field_type: 'date',
					is_custom_field: true,
				},
				{
					field_code: 'hex_enum',
					field_name: 'Priority',
					field_type: 'enum',
					is_custom_field: true,
					options: [
						{ id: 1, label: 'Low' },
						{ id: 2, label: 'High' },
					],
				},
				{
					field_code: 'hex_set',
					field_name: 'Tags',
					field_type: 'set',
					is_custom_field: true,
					options: [{ id: 5, label: 'Tag One' }],
				},
			]);

			const result = await getCustomFieldsMappingColumns.call(ctx);

			const byId = Object.fromEntries(result.fields.map((f) => [f.id, f]));
			expect(byId.hex_text.type).toBe('string');
			expect(byId.hex_num.type).toBe('number');
			expect(byId.hex_bool.type).toBe('boolean');
			expect(byId.hex_date.type).toBe('dateTime');
			expect(byId.hex_enum.type).toBe('options');
			expect(byId.hex_enum.options).toEqual([
				{ name: '— Clear value —', value: '' },
				{ name: 'Low', value: 1 },
				{ name: 'High', value: 2 },
			]);
			expect(byId.hex_set.type).toBe('string');
		});

		it('falls back to edit_flag when is_custom_field is absent (legacy v1)', async () => {
			const ctx = makeLoadOptionsMock('lead');
			ctx.helpers.requestWithAuthentication.mockResolvedValue({
				success: true,
				data: [
					{ key: 'builtin', name: 'Built-in', field_type: 'text', edit_flag: false },
					{ key: 'legacy_custom', name: 'Legacy Custom', field_type: 'text', edit_flag: true },
				],
				additional_data: { pagination: { more_items_in_collection: false } },
			});

			const result = await getCustomFieldsMappingColumns.call(ctx);

			expect(result.fields).toHaveLength(1);
			expect(result.fields[0].id).toBe('legacy_custom');
		});

		it('uses v1 key/name when v2 field_code/field_name is missing (lead)', async () => {
			const ctx = makeLoadOptionsMock('lead');
			ctx.helpers.requestWithAuthentication.mockResolvedValue({
				success: true,
				data: [
					{
						key: 'v1_hex',
						name: 'Lead Custom',
						field_type: 'text',
						is_custom_field: true,
					},
				],
				additional_data: {
					pagination: { more_items_in_collection: false },
				},
			});

			const result = await getCustomFieldsMappingColumns.call(ctx);

			expect(result.fields).toHaveLength(1);
			expect(result.fields[0]).toMatchObject({
				id: 'v1_hex',
				displayName: 'Lead Custom',
				type: 'string',
			});
		});

		it('returns empty fields with notice on transport failure', async () => {
			const ctx = makeLoadOptionsMock('deal');
			ctx.helpers.requestWithAuthentication.mockRejectedValue(new Error('boom'));

			const result = await getCustomFieldsMappingColumns.call(ctx);

			expect(result.fields).toEqual([]);
			expect(result.emptyFieldsNotice).toContain('Could not load');
		});

		it('sorts fields alphabetically by displayName', async () => {
			const ctx = makeLoadOptionsMock('deal');
			mockApiResponse(ctx, [
				{ field_code: 'a', field_name: 'Zeta', field_type: 'text', is_custom_field: true },
				{ field_code: 'b', field_name: 'Alpha', field_type: 'text', is_custom_field: true },
				{ field_code: 'c', field_name: 'Mike', field_type: 'text', is_custom_field: true },
			]);

			const result = await getCustomFieldsMappingColumns.call(ctx);

			expect(result.fields.map((f) => f.displayName)).toEqual(['Alpha', 'Mike', 'Zeta']);
		});
	});

	describe('mapPipedriveFieldType', () => {
		it.each([
			['varchar', 'string'],
			['varchar_auto', 'string'],
			['text', 'string'],
			['phone', 'string'],
			['address', 'string'],
			['int', 'number'],
			['double', 'number'],
			['monetary', 'number'],
			['boolean', 'boolean'],
			['date', 'dateTime'],
			['daterange', 'dateTime'],
			['time', 'time'],
			['timerange', 'time'],
			['enum', 'options'],
			['visible_to', 'options'],
			['set', 'string'],
			['org', 'number'],
			['people', 'number'],
			['person', 'number'],
			['user', 'number'],
			['deal', 'number'],
			['product', 'number'],
		])('maps %s -> %s', (input, expected) => {
			expect(mapPipedriveFieldType(input)).toBe(expected);
		});

		it('falls through unknown types to string', () => {
			expect(mapPipedriveFieldType('mystery')).toBe('string');
		});

		it('handles undefined input', () => {
			expect(mapPipedriveFieldType(undefined)).toBe('string');
		});
	});
});
