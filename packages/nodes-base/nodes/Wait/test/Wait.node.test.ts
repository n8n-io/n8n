import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import { NodeOperationError, type IExecuteFunctions } from 'n8n-workflow';

import { Wait } from '../Wait.node';

describe('Execute Wait Node', () => {
	let timer: NodeJS.Timeout;
	const { clearInterval, setInterval } = global;
	const nextDay = DateTime.now().startOf('day').plus({ days: 1 });

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
			value: nextDay.toISO(),
			isValid: true,
			expectedWaitTill: nextDay.toJSDate(),
		},
		{
			value: nextDay.toISO({ includeOffset: true }),
			isValid: true,
			expectedWaitTill: nextDay.toUTC().toJSDate(),
		},
		{
			value: nextDay.toJSDate(),
			isValid: true,
			expectedWaitTill: nextDay.toJSDate(),
		},
		{
			value: nextDay,
			isValid: true,
			expectedWaitTill: nextDay.toJSDate(),
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

	test('should reject if canceled', async () => {
		const putExecutionToWaitSpy = jest.fn();
		const waitNode = new Wait();

		let cancelSignal: (() => void) | null = null;

		const executeFunctionsMock = mock<IExecuteFunctions>({
			getNodeParameter: jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'resume') return 'timeInterval';
				if (paramName === 'unit') return 'seconds';
				if (paramName === 'amount') return 60;
			}),
			getTimezone: jest.fn().mockReturnValue('UTC'),
			putExecutionToWait: putExecutionToWaitSpy,
			getInputData: jest.fn(),
			getNode: jest.fn(),
			onExecutionCancellation: (handler) => {
				cancelSignal = handler;
			},
		});

		const waitPromise = waitNode.execute(executeFunctionsMock);

		for (let index = 0; index < 20; index++) {
			await new Promise((r) => setTimeout(r, 10));
			if (cancelSignal !== null) break;
		}

		expect(cancelSignal).not.toBeNull();
		cancelSignal!();

		await expect(waitPromise).rejects.toThrow(NodeOperationError);
	});

	new NodeTestHarness().setupTests();
});
