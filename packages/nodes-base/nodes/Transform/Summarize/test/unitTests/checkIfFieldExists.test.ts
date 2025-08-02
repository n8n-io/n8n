import { NodeOperationError, type IExecuteFunctions, type IDataObject } from 'n8n-workflow';

import { checkIfFieldExists, type Aggregations } from '../../utils';

describe('Test Summarize Node, checkIfFieldExists', () => {
	let mockExecuteFunctions: IExecuteFunctions;

	beforeEach(() => {
		mockExecuteFunctions = {
			getNode: jest.fn().mockReturnValue({ name: 'test-node' }),
		} as unknown as IExecuteFunctions;
	});

	const items = [{ a: 1 }, { b: 2 }, { c: 3 }];

	it('should not throw error if all fields exist', () => {
		const aggregations: Aggregations = [
			{ aggregation: 'sum', field: 'a' },
			{ aggregation: 'count', field: 'c' },
		];
		const getValue = (item: IDataObject, field: string) => item[field];
		expect(() => {
			checkIfFieldExists.call(mockExecuteFunctions, items, aggregations, getValue);
		}).not.toThrow();
	});

	it('should throw NodeOperationError if any field does not exist', () => {
		const aggregations: Aggregations = [
			{ aggregation: 'sum', field: 'b' },
			{ aggregation: 'count', field: 'd' },
		];
		const getValue = (item: IDataObject, field: string) => item[field];
		expect(() => {
			checkIfFieldExists.call(mockExecuteFunctions, items, aggregations, getValue);
		}).toThrow(NodeOperationError);
	});

	it("should throw NodeOperationError with error message containing the field name that doesn't exist", () => {
		const aggregations: Aggregations = [{ aggregation: 'count', field: 'D' }];
		const getValue = (item: IDataObject, field: string) => item[field];
		expect(() => {
			checkIfFieldExists.call(mockExecuteFunctions, items, aggregations, getValue);
		}).toThrow("The field 'D' does not exist in any items");
	});

	it('should not throw error if field is empty string', () => {
		const aggregations: Aggregations = [{ aggregation: 'count', field: '' }];
		const getValue = (item: IDataObject, field: string) => item[field];
		expect(() => {
			checkIfFieldExists.call(mockExecuteFunctions, items, aggregations, getValue);
		}).not.toThrow();
	});
});
