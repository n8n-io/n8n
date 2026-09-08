import { NodeOperationError } from 'n8n-workflow';
import { checkIfFieldExists } from '../../utils';
describe('Test Summarize Node, checkIfFieldExists', () => {
    let mockExecuteFunctions;
    beforeEach(() => {
        mockExecuteFunctions = {
            getNode: vi.fn().mockReturnValue({ name: 'test-node' }),
        };
    });
    const items = [{ a: 1 }, { b: 2 }, { c: 3 }];
    it('should not throw error if all fields exist', () => {
        const aggregations = [
            { aggregation: 'sum', field: 'a' },
            { aggregation: 'count', field: 'c' },
        ];
        const getValue = (item, field) => item[field];
        expect(() => {
            checkIfFieldExists.call(mockExecuteFunctions, items, aggregations, getValue);
        }).not.toThrow();
    });
    it('should throw NodeOperationError if any field does not exist', () => {
        const aggregations = [
            { aggregation: 'sum', field: 'b' },
            { aggregation: 'count', field: 'd' },
        ];
        const getValue = (item, field) => item[field];
        expect(() => {
            checkIfFieldExists.call(mockExecuteFunctions, items, aggregations, getValue);
        }).toThrow(NodeOperationError);
    });
    it("should throw NodeOperationError with error message containing the field name that doesn't exist", () => {
        const aggregations = [{ aggregation: 'count', field: 'D' }];
        const getValue = (item, field) => item[field];
        expect(() => {
            checkIfFieldExists.call(mockExecuteFunctions, items, aggregations, getValue);
        }).toThrow("The field 'D' does not exist in any items");
    });
    it('should not throw error if field is empty string', () => {
        const aggregations = [{ aggregation: 'count', field: '' }];
        const getValue = (item, field) => item[field];
        expect(() => {
            checkIfFieldExists.call(mockExecuteFunctions, items, aggregations, getValue);
        }).not.toThrow();
    });
});
//# sourceMappingURL=checkIfFieldExists.test.js.map