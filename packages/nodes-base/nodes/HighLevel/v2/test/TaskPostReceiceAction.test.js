import { taskPostReceiceAction } from '../GenericFunctions';
describe('taskPostReceiceAction', () => {
    let mockThis;
    beforeEach(() => {
        mockThis = {
            getNodeParameter: vi.fn((parameterName) => {
                if (parameterName === 'contactId')
                    return '12345';
                return undefined;
            }),
        };
    });
    it('should add contactId to each item in items', async () => {
        const items = [
            { json: { field1: 'value1' } },
            { json: { field2: 'value2' } },
        ];
        const response = {
            body: {},
            headers: {},
            statusCode: 200,
        };
        const result = await taskPostReceiceAction.call(mockThis, items, response);
        expect(result).toEqual([
            { json: { field1: 'value1', contactId: '12345' } },
            { json: { field2: 'value2', contactId: '12345' } },
        ]);
        expect(mockThis.getNodeParameter).toHaveBeenCalledWith('contactId');
    });
    it('should not modify other fields in items', async () => {
        const items = [{ json: { name: 'John Doe' } }, { json: { age: 30 } }];
        const response = {
            body: {},
            headers: {},
            statusCode: 200,
        };
        const result = await taskPostReceiceAction.call(mockThis, items, response);
        expect(result).toEqual([
            { json: { name: 'John Doe', contactId: '12345' } },
            { json: { age: 30, contactId: '12345' } },
        ]);
        expect(mockThis.getNodeParameter).toHaveBeenCalledWith('contactId');
    });
    it('should return an empty array if items is empty', async () => {
        const items = [];
        const response = {
            body: {},
            headers: {},
            statusCode: 200,
        };
        const result = await taskPostReceiceAction.call(mockThis, items, response);
        expect(result).toEqual([]);
        expect(mockThis.getNodeParameter).toHaveBeenCalledWith('contactId');
    });
});
//# sourceMappingURL=TaskPostReceiceAction.test.js.map