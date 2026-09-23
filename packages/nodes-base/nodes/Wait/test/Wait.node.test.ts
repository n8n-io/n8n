import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { mock } from 'vitest-mock-extended';
import { DateTime } from 'luxon';
import {
	FORM_TRIGGER_NODE_TYPE,
	NodeOperationError,
	UserError,
	WAIT_INDEFINITELY,
	type IExecuteFunctions,
} from 'n8n-workflow';

import { Wait } from '../Wait.node';

describe('Execute Wait Node', () => {
	let timer: NodeJS.Timeout;
	const { clearInterval, setInterval } = global;
	const nextDay = DateTime.now().startOf('day').plus({ days: 1 });

	beforeAll(() => {
		timer = setInterval(() => vi.advanceTimersByTime(1000), 10);
		vi.useFakeTimers().setSystemTime(new Date('2025-01-01'));
	});

	afterAll(() => {
		clearInterval(timer);
		vi.useRealTimers();
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
			const putExecutionToWaitSpy = vi.fn();
			const waitNode = new Wait();
			const executeFunctionsMock = mock<IExecuteFunctions>({
				getNodeParameter: vi.fn().mockImplementation((paramName: string) => {
					if (paramName === 'resume') return 'specificTime';
					if (paramName === 'dateTime') return value;
				}),
				getTimezone: vi.fn().mockReturnValue('UTC'),
				putExecutionToWait: putExecutionToWaitSpy,
				getInputData: vi.fn(),
				getNode: vi.fn(),
			});

			if (isValid) {
				await expect(waitNode.execute(executeFunctionsMock)).resolves.not.toThrow();
				expect(putExecutionToWaitSpy).toHaveBeenCalledWith(expectedWaitTill, {
					acceptsResumeRequest: false,
				});
			} else {
				await expect(waitNode.execute(executeFunctionsMock)).rejects.toThrow(NodeOperationError);
			}
		},
	);

	test('hands a short time wait to core and sleeps for nothing itself', async () => {
		const putExecutionToWaitSpy = vi.fn();
		const waitNode = new Wait();
		const inputData = [{ json: { test: 'data' } }];

		const executeFunctionsMock = mock<IExecuteFunctions>({
			getNodeParameter: vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'resume') return 'timeInterval';
				if (paramName === 'unit') return 'seconds';
				if (paramName === 'amount') return 30;
			}),
			getTimezone: vi.fn().mockReturnValue('UTC'),
			putExecutionToWait: putExecutionToWaitSpy,
			getInputData: vi.fn(() => inputData),
			getNode: vi.fn(),
		});

		await expect(waitNode.execute(executeFunctionsMock)).resolves.toEqual([inputData]);

		expect(putExecutionToWaitSpy).toHaveBeenCalledWith(expect.any(Date), {
			acceptsResumeRequest: false,
		});
		// Core owns the sleep and its cancellation handler.
		expect(executeFunctionsMock.onExecutionCancellation).not.toHaveBeenCalled();
	});

	test('lets a resume request end a webhook wait', async () => {
		const putExecutionToWaitSpy = vi.fn();
		const waitNode = new Wait();

		const executeFunctionsMock = mock<IExecuteFunctions>({
			getNodeParameter: vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'resume') return 'webhook';
				if (paramName === 'limitWaitTime') return false;
			}),
			getTimezone: vi.fn().mockReturnValue('UTC'),
			evaluateExpression: vi.fn().mockReturnValue('https://n8n.test/resume-url'),
			putExecutionToWait: putExecutionToWaitSpy,
			getInputData: vi.fn(() => []),
			getNode: vi.fn().mockReturnValue({ name: 'Wait' }),
			getParentNodes: vi.fn().mockReturnValue([]),
		});

		await waitNode.execute(executeFunctionsMock);

		expect(putExecutionToWaitSpy).toHaveBeenCalledWith(WAIT_INDEFINITELY, {
			acceptsResumeRequest: true,
		});
	});

	test('should fail the node when the form redirect response cannot be dispatched', async () => {
		const waitNode = new Wait();
		const executeFunctionsMock = mock<IExecuteFunctions>({
			getNodeParameter: vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'resume') return 'form';
				if (paramName === 'limitWaitTime') return false;
			}),
			getNode: vi.fn().mockReturnValue({ name: 'Wait' }),
			getParentNodes: vi.fn().mockReturnValue([{ type: FORM_TRIGGER_NODE_TYPE }]),
			evaluateExpression: vi.fn().mockReturnValue('https://n8n.test/form-url'),
			getTimezone: vi.fn().mockReturnValue('UTC'),
			putExecutionToWait: vi.fn(),
			getInputData: vi.fn(() => []),
			sendResponse: vi.fn().mockRejectedValue(new UserError('Response not relayed')),
		});

		await expect(waitNode.execute(executeFunctionsMock)).rejects.toThrow('Response not relayed');
	});

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
					const putExecutionToWaitSpy = vi.fn();
					const waitNode = new Wait();
					const inputData = [{ json: { inputData: true } }];
					const executeFunctionsMock = mock<IExecuteFunctions>({
						getNodeParameter: vi.fn().mockImplementation((paramName: string) => {
							if (paramName === 'resume') return 'timeInterval';
							if (paramName === 'amount') return amount;
							if (paramName === 'unit') return unit;
						}),
						getTimezone: vi.fn().mockReturnValue('UTC'),
						putExecutionToWait: putExecutionToWaitSpy,
						getInputData: vi.fn(() => inputData),
						getNode: vi.fn(),
					});

					if (!error) {
						// Every valid interval takes the same path. Core chooses how to wait.
						await expect(waitNode.execute(executeFunctionsMock)).resolves.toEqual([inputData]);
						expect(putExecutionToWaitSpy).toHaveBeenCalledWith(expectedWaitTill?.(), {
							acceptsResumeRequest: false,
						});
					} else {
						await expect(waitNode.execute(executeFunctionsMock)).rejects.toThrowError(error);
					}
				},
			);
		});
	});

	new NodeTestHarness().setupTests();
});
