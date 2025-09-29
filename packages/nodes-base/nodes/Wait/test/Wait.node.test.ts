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
		jest.useFakeTimers().setSystemTime(new Date('2025-01-01'));
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

	describe('Validation', () => {
		describe('Time interval', () => {
			it.each([
				{
					unit: 'seconds',
					amount: 300,
					expectedWaitTill: () => DateTime.now().plus({ seconds: 300 }).toJSDate(),
				},
				{
					unit: 'minutes',
					amount: 2,
					expectedWaitTill: () => DateTime.now().plus({ minutes: 2 }).toJSDate(),
				},
				{
					unit: 'hours',
					amount: 1,
					expectedWaitTill: () => DateTime.now().plus({ hours: 1 }).toJSDate(),
				},
				{
					unit: 'days',
					amount: 10,
					expectedWaitTill: () => DateTime.now().plus({ days: 10 }).toJSDate(),
				},
				{
					unit: 'seconds',
					amount: 0,
					mode: 'timeout',
					expectedWaitTill: () => DateTime.now().toJSDate(),
				},
				{
					unit: 'seconds',
					amount: -10,
					error: 'Invalid wait amount. Please enter a number that is 0 or greater.',
				},
				{
					unit: 'years',
					amount: 10,
					error: "Invalid wait unit. Valid units are 'seconds', 'minutes', 'hours', or 'days'.",
				},
				{
					unit: 'minutes',
					amount: 'test',
					error: 'Invalid wait amount. Please enter a number that is 0 or greater.',
				},
			])(
				'Validate wait unit: $unit, amount: $amount',
				async ({ unit, amount, expectedWaitTill, error, mode }) => {
					const putExecutionToWaitSpy = jest.fn();
					const waitNode = new Wait();
					const inputData = [{ json: { inputData: true } }];
					const executeFunctionsMock = mock<IExecuteFunctions>({
						getNodeParameter: jest.fn().mockImplementation((paramName: string) => {
							if (paramName === 'resume') return 'timeInterval';
							if (paramName === 'amount') return amount;
							if (paramName === 'unit') return unit;
						}),
						getTimezone: jest.fn().mockReturnValue('UTC'),
						putExecutionToWait: putExecutionToWaitSpy,
						getInputData: jest.fn(() => inputData),
						getNode: jest.fn(),
					});

					if (!error) {
						if (mode === 'timeout') {
							// for short wait times (<65s) a simple timeout is used
							const resultPromise = waitNode.execute(executeFunctionsMock);
							jest.runAllTimers();
							await expect(resultPromise).resolves.toEqual([inputData]);
						} else {
							// for longer wait times (>=65s) the execution is put to wait
							await expect(waitNode.execute(executeFunctionsMock)).resolves.not.toThrow();
							expect(putExecutionToWaitSpy).toHaveBeenCalledWith(expectedWaitTill?.());
						}
					} else {
						await expect(waitNode.execute(executeFunctionsMock)).rejects.toThrowError(error);
					}
				},
			);
		});
	});

	new NodeTestHarness().setupTests();
});
