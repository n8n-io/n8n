import { DateTime } from 'luxon';
import { NodeOperationError, type IExecuteFunctions } from 'n8n-workflow';

import { testWorkflows, getWorkflowFilenames } from '@test/nodes/Helpers';

import { Wait } from '../Wait.node';
const workflows = getWorkflowFilenames(__dirname);

describe('Execute Wait Node', () => {
	let timer: NodeJS.Timer;
	const { clearInterval, setInterval } = global;

	beforeAll(() => {
		timer = setInterval(() => jest.advanceTimersByTime(1000), 10);
		jest.useFakeTimers();
	});

	afterAll(() => {
		clearInterval(timer);
		jest.useRealTimers();
	});

	test.each<{ value: Date | DateTime | string; isValid: boolean }>([
		{ value: 'invalid_date', isValid: false },
		{ value: DateTime.now().plus({ days: 1 }).toISO(), isValid: true },
		{ value: DateTime.now().plus({ days: 1 }).toJSDate(), isValid: true },
		{ value: DateTime.now().plus({ days: 1 }), isValid: true },
	])('Test Wait Node with specificTime $value and isValid $isValid', async ({ value, isValid }) => {
		const waitNode = new Wait();
		const executeFunctionsMock: IExecuteFunctions = {
			getNodeParameter: jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'resume') return 'specificTime';
				if (paramName === 'dateTime') return value;
			}),
			getTimezone: jest.fn().mockReturnValue('UTC'),
			putExecutionToWait: jest.fn(),
			getInputData: jest.fn(),
			getNode: jest.fn(),
		} as unknown as IExecuteFunctions;

		if (isValid) {
			await expect(waitNode.execute(executeFunctionsMock)).resolves.not.toThrow();
		} else {
			await expect(waitNode.execute(executeFunctionsMock)).rejects.toThrow(NodeOperationError);
		}
	});

	testWorkflows(workflows);
});
