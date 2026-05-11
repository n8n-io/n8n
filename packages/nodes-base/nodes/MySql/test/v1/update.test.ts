import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { mock } from 'jest-mock-extended';
import type { Connection, OkPacket } from 'mysql2/promise';

const mockConnection = mock<Connection>();
const createConnection = jest.fn().mockResolvedValue(mockConnection);
jest.mock('mysql2/promise', () => ({ createConnection }));

afterEach(() => jest.clearAllMocks());

describe('Test MySqlV1, update - identifier escaping', () => {
	mockConnection.query.mockResolvedValue([{ affectedRows: 1 } as unknown as OkPacket, []]);
	mockConnection.end.mockResolvedValue(undefined as any);

	new NodeTestHarness().setupTests({
		workflowFiles: ['update.workflow.json'],
		customAssertions() {
			expect(mockConnection.query).toHaveBeenCalledTimes(1);
			expect(mockConnection.query).toHaveBeenCalledWith(
				expect.stringContaining('`orders; groups`'),
				expect.anything(),
			);
			expect(mockConnection.query).toHaveBeenCalledWith(
				expect.stringContaining('`status`'),
				expect.anything(),
			);
			expect(mockConnection.query).toHaveBeenCalledWith(
				expect.stringContaining('`id`'),
				expect.anything(),
			);
		},
	});
});

describe('Test MySqlV1, update - table name with backtick', () => {
	mockConnection.query.mockResolvedValue([{ affectedRows: 1 } as unknown as OkPacket, []]);
	mockConnection.end.mockResolvedValue(undefined as any);

	new NodeTestHarness().setupTests({
		workflowFiles: ['update-backtick.workflow.json'],
		customAssertions() {
			expect(mockConnection.query).toHaveBeenCalledTimes(1);
			// A backtick in the identifier is treated as a separator: each part gets wrapped individually
			expect(mockConnection.query).toHaveBeenCalledWith(
				expect.stringContaining('`order`.`; groups`'),
				expect.anything(),
			);
		},
	});
});
