import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import { NodeOperationError, type IExecuteFunctions } from 'n8n-workflow';

import { Wait } from '../Wait.node';

describe('Execute Wait Node', () => {
	const nextDay = DateTime.now().startOf('day').plus({ days: 1 });

	beforeAll(() => {
		jest.useFakeTimers().setSystemTime(new Date('2025-01-01'));
	});

	afterAll(() => {
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
				// Previously in-memory path (< 65s) — now all go through putToWait
				{
					unit: 'seconds',
					amount: 5,
					expectedWaitTill: () => DateTime.now().plus({ seconds: 5 }).toJSDate(),
				},
				{
					unit: 'seconds',
					amount: 30,
					expectedWaitTill: () => DateTime.now().plus({ seconds: 30 }).toJSDate(),
				},
				{
					unit: 'seconds',
					amount: 60,
					expectedWaitTill: () => DateTime.now().plus({ seconds: 60 }).toJSDate(),
				},
				{
					unit: 'seconds',
					amount: 64,
					expectedWaitTill: () => DateTime.now().plus({ seconds: 64 }).toJSDate(),
				},
				// DB-persisted path (>= 65s)
				{
					unit: 'seconds',
					amount: 66,
					expectedWaitTill: () => DateTime.now().plus({ seconds: 66 }).toJSDate(),
				},
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
				async ({ unit, amount, expectedWaitTill, error }) => {
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
						// All time-based waits are now persisted to DB via putToWait
						await expect(waitNode.execute(executeFunctionsMock)).resolves.not.toThrow();
						expect(putExecutionToWaitSpy).toHaveBeenCalledWith(expectedWaitTill?.());
					} else {
						await expect(waitNode.execute(executeFunctionsMock)).rejects.toThrowError(error);
					}
				},
			);
		});
	});

	new NodeTestHarness().setupTests();
});
