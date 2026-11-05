import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { Aggregate } from '../Aggregate.node';

describe('Aggregate output field names', () => {
	const execute = async (
		fields: Array<{ fieldToAggregate: string; renameField?: boolean; outputFieldName?: string }>,
		{
			disableDotNotation = false,
			inputData = [
				{ customer: { name: 'Alice' }, supplier: { name: 'Acme' }, name: 'first' },
				{ customer: { name: 'Bob' }, supplier: { name: 'Beta' }, name: 'second' },
			],
		}: { disableDotNotation?: boolean; inputData?: IDataObject[] } = {},
	) => {
		const context = mock<IExecuteFunctions>();
		context.getInputData.mockReturnValue(inputData.map((json) => ({ json })));
		context.getNode.mockReturnValue(mock<INode>({ typeVersion: 1 }));
		context.getNodeParameter.mockImplementation((parameterName, _itemIndex, fallbackValue) => {
			if (parameterName === 'aggregate') return 'aggregateIndividualFields';
			if (parameterName === 'fieldsToAggregate.fieldToAggregate') return fields;
			if (parameterName === 'options.disableDotNotation') return disableDotNotation;
			return fallbackValue;
		});

		return await new Aggregate().execute.call(context);
	};

	it.each([
		{
			caseName: 'two nested fields with the same final name',
			fields: [{ fieldToAggregate: 'customer.name' }, { fieldToAggregate: 'supplier.name' }],
		},
		{
			caseName: 'a nested field and a top-level field with the same name',
			fields: [{ fieldToAggregate: 'customer.name' }, { fieldToAggregate: 'name' }],
		},
		{
			caseName: 'a nested field and an explicit output name',
			fields: [
				{ fieldToAggregate: 'customer.name' },
				{ fieldToAggregate: 'supplier.name', renameField: true, outputFieldName: 'name' },
			],
		},
		{
			caseName: 'an empty rename that falls back to a nested field name',
			fields: [
				{ fieldToAggregate: 'customer.name', renameField: true, outputFieldName: '' },
				{ fieldToAggregate: 'supplier.name' },
			],
		},
	])('should reject $caseName', async ({ fields }) => {
		await expect(execute(fields)).rejects.toThrow("The 'name' output field is used more than once");
	});

	it('should still reject duplicate explicit output names', async () => {
		await expect(
			execute([
				{ fieldToAggregate: 'customer.name', renameField: true, outputFieldName: 'names' },
				{ fieldToAggregate: 'supplier.name', renameField: true, outputFieldName: 'names' },
			]),
		).rejects.toThrow("The 'names' output field is used more than once");
	});

	it('should preserve both lists when the output names are unique', async () => {
		const result = await execute([
			{ fieldToAggregate: 'customer.name', renameField: true, outputFieldName: 'customer_names' },
			{ fieldToAggregate: 'supplier.name', renameField: true, outputFieldName: 'supplier_names' },
		]);

		expect(result[0][0].json).toEqual({
			customer_names: ['Alice', 'Bob'],
			supplier_names: ['Acme', 'Beta'],
		});
	});

	it.each([
		['user', 'user.name'],
		['user.name', 'user'],
		['user[0]', 'user[0].name'],
		['user[0].name', 'user[0]'],
		['user.name', 'user["name"]'],
	])('should reject overlapping output paths %s and %s', async (first, second) => {
		await expect(
			execute([
				{ fieldToAggregate: 'customer.name', renameField: true, outputFieldName: first },
				{ fieldToAggregate: 'supplier.name', renameField: true, outputFieldName: second },
			]),
		).rejects.toThrow('overlap');
	});

	it('should allow sibling output paths', async () => {
		const result = await execute([
			{ fieldToAggregate: 'customer.name', renameField: true, outputFieldName: 'user.name' },
			{ fieldToAggregate: 'supplier.name', renameField: true, outputFieldName: 'user.supplier' },
		]);
		expect(result[0][0].json).toEqual({
			user: { name: ['Alice', 'Bob'], supplier: ['Acme', 'Beta'] },
		});
	});

	it.each([
		['user', 'user.name'],
		['user.name', 'user'],
	])(
		'should allow literal output names %s and %s when dot notation is disabled',
		async (first, second) => {
			const result = await execute(
				[
					{ fieldToAggregate: 'customer', renameField: true, outputFieldName: first },
					{ fieldToAggregate: 'supplier', renameField: true, outputFieldName: second },
				],
				{ disableDotNotation: true, inputData: [{ customer: 'Alice', supplier: 'Acme' }] },
			);
			expect(result[0][0].json).toEqual({ [first]: ['Alice'], [second]: ['Acme'] });
		},
	);

	it('should keep literal dotted names distinct when dot notation is disabled', async () => {
		const result = await execute(
			[{ fieldToAggregate: 'customer.name' }, { fieldToAggregate: 'supplier.name' }],
			{
				disableDotNotation: true,
				inputData: [
					{ 'customer.name': 'Alice', 'supplier.name': 'Acme' },
					{ 'customer.name': 'Bob', 'supplier.name': 'Beta' },
				],
			},
		);

		expect(result[0][0].json).toEqual({
			'customer.name': ['Alice', 'Bob'],
			'supplier.name': ['Acme', 'Beta'],
		});
	});
});
