import {
	fieldValueGetter,
	aggregateAndSplitData,
	flattenAggregationResultToArray,
	type Aggregations,
} from '../../utils';

describe('Test Summarize Node, aggregateAndSplitData', () => {
	test('should not convert strings to numbers', () => {
		const data = [
			{
				Sku: '012345',
				Warehouse: 'BER_0G',
				Qty: '1',
				_itemIndex: 0,
			},
			{
				Sku: '012345',
				Warehouse: 'BER_0L',
				Qty: '2',
				_itemIndex: 1,
			},
			{
				Sku: '06534563534',
				Warehouse: 'BER_0L',
				Qty: '1',
				_itemIndex: 2,
			},
		];

		const aggregations: Aggregations = [
			{
				aggregation: 'append',
				field: 'Warehouse',
				includeEmpty: true,
			},
		];

		const result = aggregateAndSplitData({
			splitKeys: ['Sku', 'Qty'],
			inputItems: data,
			fieldsToSummarize: aggregations,
			options: { continueIfFieldNotFound: true },
			getValue: fieldValueGetter(),
		});
		expect(result).toMatchSnapshot('result');
		expect(flattenAggregationResultToArray(result)).toMatchSnapshot('array');
	});

	test('should not convert numbers to strings', () => {
		const data = [
			{
				Sku: 12345,
				Warehouse: 'BER_0G',
				Qty: 1,
				_itemIndex: 0,
			},
			{
				Sku: 12345,
				Warehouse: 'BER_0L',
				Qty: 2,
				_itemIndex: 1,
			},
			{
				Sku: 6534563534,
				Warehouse: 'BER_0L',
				Qty: 1,
				_itemIndex: 2,
			},
		];

		const aggregations: Aggregations = [
			{
				aggregation: 'append',
				field: 'Warehouse',
				includeEmpty: true,
			},
		];

		const result = aggregateAndSplitData({
			splitKeys: ['Sku', 'Qty'],
			inputItems: data,
			fieldsToSummarize: aggregations,
			options: { continueIfFieldNotFound: true },
			getValue: fieldValueGetter(),
		});
		expect(result).toMatchSnapshot('result');
		expect(flattenAggregationResultToArray(result)).toMatchSnapshot('array');
	});

	describe('with skipEmptySplitFields=true', () => {
		test('should skip empty split fields', () => {
			const data = [
				{
					Sku: 12345,
					Warehouse: 'BER_0G',
					_itemIndex: 0,
				},
				{
					Warehouse: 'BER_0L',
					_itemIndex: 1,
				},
				{
					Sku: {},
					Warehouse: 'BER_0L',
					_itemIndex: 2,
				},
				{
					Sku: 12345,
					Warehouse: { name: 'BER_0G3' },
					_itemIndex: 3,
				},
			];

			const aggregations: Aggregations = [
				{
					aggregation: 'concatenate',
					field: 'Warehouse',
					separateBy: 'other',
					customSeparator: '//',
				},
			];

			const result = aggregateAndSplitData({
				splitKeys: ['Sku'],
				inputItems: data,
				fieldsToSummarize: aggregations,
				options: { continueIfFieldNotFound: true, skipEmptySplitFields: true },
				getValue: fieldValueGetter(),
			});
			expect(result).toMatchSnapshot('result');
			expect(flattenAggregationResultToArray(result)).toMatchSnapshot('array');
		});
	});
});
