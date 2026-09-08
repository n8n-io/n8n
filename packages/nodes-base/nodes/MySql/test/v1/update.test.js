import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { mock } from 'vitest-mock-extended';
import mysql2 from 'mysql2/promise';
const mockConnection = mock();
// The harness loads the node from dist via require(), so vi.mock cannot intercept its
// `mysql2/promise` import. mysql2 is externalized, so the test and the node share the same
// module instance — spy on it instead. Re-applied per test since restoreMocks resets spies.
beforeEach(() => {
    vi.spyOn(mysql2, 'createConnection').mockResolvedValue(mockConnection);
    mockConnection.query.mockResolvedValue([{ affectedRows: 1 }, []]);
    mockConnection.end.mockResolvedValue(undefined);
});
afterEach(() => vi.clearAllMocks());
describe('Test MySqlV1, update - identifier escaping', () => {
    new NodeTestHarness().setupTests({
        workflowFiles: ['update.workflow.json'],
        customAssertions() {
            expect(mockConnection.query).toHaveBeenCalledTimes(1);
            expect(mockConnection.query).toHaveBeenCalledWith(expect.stringContaining('`orders; groups`'), expect.anything());
            expect(mockConnection.query).toHaveBeenCalledWith(expect.stringContaining('`status`'), expect.anything());
            expect(mockConnection.query).toHaveBeenCalledWith(expect.stringContaining('`id`'), expect.anything());
        },
    });
});
describe('Test MySqlV1, update - table name with backtick', () => {
    new NodeTestHarness().setupTests({
        workflowFiles: ['update-backtick.workflow.json'],
        customAssertions() {
            expect(mockConnection.query).toHaveBeenCalledTimes(1);
            // A backtick in the identifier is treated as a separator: each part gets wrapped individually
            expect(mockConnection.query).toHaveBeenCalledWith(expect.stringContaining('`order`.`; groups`'), expect.anything());
        },
    });
});
//# sourceMappingURL=update.test.js.map