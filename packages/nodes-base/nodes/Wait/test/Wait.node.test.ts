import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';
import { DateTime } from 'luxon';
import {
	displayParameter,
	FORM_TRIGGER_NODE_TYPE,
	NodeOperationError,
	WAIT_INDEFINITELY,
	type IExecuteFunctions,
	type IWebhookFunctions,
	type NodeParameterValueType,
} from 'n8n-workflow';
import { UserError } from '@n8n/errors';

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

	test('hands a short time wait to core without sleeping itself', async () => {
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

		const before = Date.now();
		await expect(waitNode.execute(executeFunctionsMock)).resolves.toEqual([inputData]);
		const after = Date.now();

		const [waitTill, options] = putExecutionToWaitSpy.mock.calls[0] as [Date, unknown];
		expect(options).toEqual({ acceptsResumeRequest: false });
		// Pin the deadline itself. A sentinel date is also a `Date`, and core would then
		// suspend the execution with nothing able to resume it.
		expect(waitTill.getTime()).toBeGreaterThanOrEqual(before + 30_000);
		expect(waitTill.getTime()).toBeLessThanOrEqual(after + 30_000);
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

describe('Wait Node description', () => {
	it.each([1, 1.1, 1.2])('shows the response mode for version %s', (typeVersion) => {
		const { description } = new Wait();
		const responseMode = description.properties.find(
			({ name, displayOptions }) =>
				name === 'responseMode' && displayOptions?.show?.resume?.includes('webhook'),
		);

		expect(
			displayParameter({ resume: 'webhook' }, responseMode!, { typeVersion }, description),
		).toBe(true);
	});
});

describe('Wait Node webhook authentication', () => {
	const createWebhookContext = (resume: 'webhook' | 'form', incomingAuthentication: string) => {
		const context = mock<IWebhookFunctions>({ nodeHelpers: mock(), logger: mock() });
		const req = mock<Request>();
		const res = mock<Response>();

		req.headers = {};
		req.params = {};
		req.query = {};
		req.method = 'POST';
		req.body = { message: 'hello' };
		Object.defineProperty(req, 'ips', { value: [], configurable: true });
		Object.defineProperty(req, 'ip', { value: '127.0.0.1', configurable: true });

		res.writeHead.mockImplementation(() => res);
		res.end.mockImplementation(() => res);
		res.setHeader.mockImplementation(() => res);
		res.status.mockImplementation(() => res);
		res.send.mockImplementation(() => res);

		context.getRequestObject.mockReturnValue(req);
		context.getResponseObject.mockReturnValue(res);
		context.getHeaderData.mockReturnValue({});
		context.getChildNodes.mockReturnValue([]);
		context.getCredentials.mockResolvedValue({ user: 'admin', password: 'password' });
		context.getNode.mockReturnValue({
			id: 'wait-1',
			name: 'Wait',
			type: 'n8n-nodes-base.wait',
			typeVersion: 1.1,
			position: [0, 0],
			parameters: { resume, incomingAuthentication },
		});
		context.getNodeParameter.mockImplementation(
			(paramName: string, fallbackValue?: NodeParameterValueType | object) => {
				if (paramName === 'resume') return resume;
				if (paramName === 'incomingAuthentication') return incomingAuthentication;
				if (paramName === 'options') return {};
				if (paramName === 'responseMode') return 'onReceived';
				if (paramName === 'httpMethod') return 'POST';
				return fallbackValue;
			},
		);

		return { context, res };
	};

	it.each(['unsupportedMode', 'BasicAuth'])(
		'should return 500 without workflowData when webhook resume uses unsupported authentication mode "%s"',
		async (incomingAuthentication) => {
			const waitNode = new Wait();
			const { context, res } = createWebhookContext('webhook', incomingAuthentication);

			const result = await waitNode.webhook(context);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(res.writeHead).toHaveBeenCalledWith(500, expect.any(Object));
			expect(res.end).toHaveBeenCalled();
		},
	);

	it.each(['unsupportedMode', 'BasicAuth'])(
		'should reject form resume without workflowData when authentication mode "%s" is unsupported',
		async (incomingAuthentication) => {
			const waitNode = new Wait();
			const { context, res } = createWebhookContext('form', incomingAuthentication);

			const result = await waitNode.webhook(context);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.send).toHaveBeenCalled();
		},
	);
});
