import { mockDeep } from 'vitest-mock-extended';
import { constructExecutionMetaData } from 'n8n-core';
import pgPromise from 'pg-promise';
import { PostgresV1 } from '../../v1/PostgresV1.node';
const pgp = pgPromise();
const multiSpy = vi.fn(() => [[{ id: 2, name: 'test' }]]);
vi.mock('../../transport', () => ({
    configurePostgres: vi.fn(() => ({ db: { multi: multiSpy }, pgp })),
}));
describe('Postgres v1', () => {
    const node = new PostgresV1({
        displayName: 'Postgres',
        name: 'postgres',
        icon: 'file:postgres.svg',
        group: ['input'],
        defaultVersion: 1,
        description: 'Get, add and update data in Postgres',
    });
    const mockExecuteFunctions = mockDeep();
    beforeEach(() => {
        vi.clearAllMocks();
        mockExecuteFunctions.getCredentials.mockResolvedValue({});
        mockExecuteFunctions.helpers.constructExecutionMetaData.mockImplementation(constructExecutionMetaData);
        mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
        mockExecuteFunctions.continueOnFail.mockReturnValue(false);
    });
    it('should resolve expressions in the query for executeQuery operation', async () => {
        mockExecuteFunctions.getNodeParameter.mockImplementation((param) => {
            const params = {
                'additionalFields.largeNumbersOutput': '',
                operation: 'executeQuery',
                query: 'SELECT * FROM users WHERE id = {{ 1 + 1 }}',
                additionalFields: {},
            };
            return params[param];
        });
        mockExecuteFunctions.evaluateExpression.mockReturnValue(2);
        await node.execute.call(mockExecuteFunctions);
        expect(mockExecuteFunctions.evaluateExpression).toHaveBeenCalledWith('{{ 1 + 1 }}', 0);
        expect(multiSpy).toHaveBeenCalledWith('SELECT * FROM users WHERE id = 2');
    });
});
//# sourceMappingURL=PostgresV1.node.test.js.map