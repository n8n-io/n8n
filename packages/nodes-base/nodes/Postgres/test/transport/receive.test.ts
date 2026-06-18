import { applyLargeNumbersReceive } from '../../transport';

const BIGINT_TYPE_ID = 20;
const NUMERIC_TYPE_ID = 1700;
const OTHER_TYPE_ID = 23; // int4

describe('applyLargeNumbersReceive', () => {
	it('should return early when result is undefined', () => {
		const data = [{ id: '9007199254740993' }];
		applyLargeNumbersReceive({ data, result: undefined });
		expect(data[0].id).toBe('9007199254740993');
	});

	it('should skip fields that are not bigint or numeric', () => {
		const data = [{ count: '42' }];
		applyLargeNumbersReceive({
			data,
			result: { fields: [{ name: 'count', dataTypeID: OTHER_TYPE_ID }] },
		});
		expect(data[0].count).toBe('42');
	});

	it('should convert bigint string fields to integers', () => {
		const data = [{ id: '9007199254740993' }, { id: '100' }];
		applyLargeNumbersReceive({
			data,
			result: { fields: [{ name: 'id', dataTypeID: BIGINT_TYPE_ID }] },
		});
		expect(data[0].id).toBe(9007199254740992); // parseInt precision limit
		expect(data[1].id).toBe(100);
	});

	it('should convert numeric string fields to floats', () => {
		const data = [{ price: '99.99' }, { price: '0.001' }];
		applyLargeNumbersReceive({
			data,
			result: { fields: [{ name: 'price', dataTypeID: NUMERIC_TYPE_ID }] },
		});
		expect(data[0].price).toBe(99.99);
		expect(data[1].price).toBe(0.001);
	});

	it('should not overwrite non-string values', () => {
		const data = [{ id: 42 }, { id: null }];
		applyLargeNumbersReceive({
			data: data as Array<Record<string, unknown>>,
			result: { fields: [{ name: 'id', dataTypeID: BIGINT_TYPE_ID }] },
		});
		expect(data[0].id).toBe(42);
		expect(data[1].id).toBeNull();
	});

	it('should process multiple fields in a single result', () => {
		const data = [{ id: '1', amount: '12.50', name: 'product' }];
		applyLargeNumbersReceive({
			data,
			result: {
				fields: [
					{ name: 'id', dataTypeID: BIGINT_TYPE_ID },
					{ name: 'amount', dataTypeID: NUMERIC_TYPE_ID },
					{ name: 'name', dataTypeID: OTHER_TYPE_ID },
				],
			},
		});
		expect(data[0].id).toBe(1);
		expect(data[0].amount).toBe(12.5);
		expect(data[0].name).toBe('product');
	});

	it('should handle empty data array', () => {
		expect(() =>
			applyLargeNumbersReceive({
				data: [],
				result: { fields: [{ name: 'id', dataTypeID: BIGINT_TYPE_ID }] },
			}),
		).not.toThrow();
	});
});
