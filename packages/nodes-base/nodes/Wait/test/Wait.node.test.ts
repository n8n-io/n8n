import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import { NodeOperationError, type IExecuteFunctions } from 'n8n-workflow';

import { getWorkflowFilenames, testWorkflows } from '@test/nodes/Helpers';

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

	test.each([
		{ value: 'invalid_date', isValid: false },
		{
			value: '2025-04-18T10:50:47.560',
			isValid: true,
			expectedWaitTill: new Date('2025-04-18T10:50:47.560Z'),
		},
		{
			value: '2025-04-18T10:50:47.560+02:00',
			isValid: true,
			expectedWaitTill: new Date('2025-04-18T08:50:47.560Z'),
		},
		{
			value: DateTime.fromISO('2025-04-18T10:50:47.560Z').toJSDate(),
			isValid: true,
			expectedWaitTill: new Date('2025-04-18T10:50:47.560Z'),
		},
		{
			value: DateTime.fromISO('2025-04-18T10:50:47.560Z'),
			isValid: true,
			expectedWaitTill: new Date('2025-04-18T10:50:47.560Z'),
		},
	])(
		'Test Wait Node with specificTime $value and isValid $isValid',
		async ({ value, isValid, expectedWaitTill }) => {
			const putExecutionToWaitSpy = jest.fn();
			const waitNode = new Wait();
			const executeFunctionsMock = mock<IExecuteFunctions>({
				getNodeParameter: jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'resume') return 'specificTime';
					if (paramName === 'dateTime') return value;
				}),
				getTimezone: jest.fn().mockReturnValue('UTC'),
				putExecutionToWait: putExecutionToWaitSpy,
				getInputData: jest.fn(),
				getNode: jest.fn(),
			});

			if (isValid) {
				await expect(waitNode.execute(executeFunctionsMock)).resolves.not.toThrow();
				expect(putExecutionToWaitSpy).toHaveBeenCalledWith(expectedWaitTill);
			} else {
				await expect(waitNode.execute(executeFunctionsMock)).rejects.toThrow(NodeOperationError);
			}
		},
	);

	testWorkflows(workflows);
});
