import * as n8nWorkflow from 'n8n-workflow';

import { testTriggerNode } from '@test/nodes/TriggerHelpers';

import { ScheduleTrigger } from '../ScheduleTrigger.node';

describe('ScheduleTrigger', () => {
	Object.defineProperty(n8nWorkflow, 'randomInt', {
		value: (min: number, max: number) => Math.floor((min + max) / 2),
	});

	const HOUR = 60 * 60 * 1000;
	const MINUTE = 60 * 1000;
	const DAY = 24 * HOUR;
	const mockDate = new Date('2023-12-28 12:34:56.789Z');
	const timezone = 'Europe/Berlin';

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		jest.setSystemTime(mockDate);
	});

	describe('trigger', () => {
		it('should emit on defined schedule', async () => {
			const { emit } = await testTriggerNode(ScheduleTrigger, {
				timezone,
				node: { parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 3 }] } } },
				workflowStaticData: { recurrenceRules: [] },
			});
			expect(emit).not.toHaveBeenCalled();
			jest.advanceTimersByTime(HOUR);
			expect(emit).not.toHaveBeenCalled();
			jest.advanceTimersByTime(2 * HOUR);
			expect(emit).toHaveBeenCalledTimes(1);

			const firstTriggerData = emit.mock.calls[0][0][0][0];
			expect(firstTriggerData.json).toEqual({
				'Day of month': '28',
				'Day of week': 'Thursday',
				Hour: '15',
				Minute: '30',
				Month: 'December',
				'Readable date': 'December 28th 2023, 3:30:30 pm',
				'Readable time': '3:30:30 pm',
				Second: '30',
				Timezone: 'Europe/Berlin (UTC+01:00)',
				Year: '2023',
				timestamp: '2023-12-28T15:30:30.000+01:00',
			});

			jest.setSystemTime(new Date(firstTriggerData.json.timestamp as string));

			jest.advanceTimersByTime(2 * HOUR);
			expect(emit).toHaveBeenCalledTimes(1);
			jest.advanceTimersByTime(HOUR);
			expect(emit).toHaveBeenCalledTimes(2);
		});

		it('should emit when minutes interval is 60', async () => {
			const { emit } = await testTriggerNode(ScheduleTrigger, {
				timezone,
				node: { parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 60 }] } } },
				workflowStaticData: { recurrenceRules: [] },
			});
			expect(emit).not.toHaveBeenCalled();
			jest.advanceTimersByTime(60 * MINUTE);
			expect(emit).toHaveBeenCalledTimes(1);
			jest.advanceTimersByTime(60 * MINUTE);
			expect(emit).toHaveBeenCalledTimes(2);

			const firstTriggerData = emit.mock.calls[0][0][0][0];
			expect(firstTriggerData.json).toEqual(
				expect.objectContaining({
					timestamp: '2023-12-28T14:34:56.789+01:00',
				}),
			);
			const secondTriggerData = emit.mock.calls[1][0][0][0];
			expect(secondTriggerData.json).toEqual(
				expect.objectContaining({
					timestamp: '2023-12-28T15:34:56.789+01:00',
				}),
			);
		});

		it('should emit when minutes interval is more than 60', async () => {
			const { emit } = await testTriggerNode(ScheduleTrigger, {
				timezone,
				node: { parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 65 }] } } },
				workflowStaticData: { recurrenceRules: [] },
			});
			expect(emit).not.toHaveBeenCalled();
			jest.advanceTimersByTime(65 * MINUTE);
			expect(emit).toHaveBeenCalledTimes(1);
			jest.advanceTimersByTime(65 * MINUTE);
			expect(emit).toHaveBeenCalledTimes(2);
			jest.advanceTimersByTime(65 * MINUTE);
			expect(emit).toHaveBeenCalledTimes(3);

			const firstTriggerData = emit.mock.calls[0][0][0][0];
			expect(firstTriggerData.json).toEqual(
				expect.objectContaining({
					timestamp: '2023-12-28T14:39:56.789+01:00',
				}),
			);

			const secondTriggerData = emit.mock.calls[1][0][0][0];

			expect(secondTriggerData.json).toEqual(
				expect.objectContaining({
					timestamp: '2023-12-28T15:44:56.789+01:00',
				}),
			);
		});

		it('should emit when minutes interval is more than a day', async () => {
			const { emit } = await testTriggerNode(ScheduleTrigger, {
				timezone,
				node: {
					parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 25 * 60 + 7 }] } },
				},
				workflowStaticData: { recurrenceRules: [] },
			});
			expect(emit).not.toHaveBeenCalled();
			jest.advanceTimersByTime(25 * HOUR + 7 * MINUTE);
			expect(emit).toHaveBeenCalledTimes(1);
			jest.advanceTimersByTime(25 * HOUR + 7 * MINUTE);
			expect(emit).toHaveBeenCalledTimes(2);
			const firstTriggerData = emit.mock.calls[0][0][0][0];
			expect(firstTriggerData.json).toEqual(
				expect.objectContaining({
					timestamp: '2023-12-29T14:41:56.789+01:00',
				}),
			);

			const secondTriggerData = emit.mock.calls[1][0][0][0];
			expect(secondTriggerData.json).toEqual(
				expect.objectContaining({
					timestamp: '2023-12-30T15:48:56.789+01:00',
				}),
			);
		});

		it('should emit when hours interval is exactly 24', async () => {
			const { emit } = await testTriggerNode(ScheduleTrigger, {
				timezone,
				node: { parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 24 }] } } },
				workflowStaticData: { recurrenceRules: [] },
			});
			expect(emit).not.toHaveBeenCalled();
			jest.advanceTimersByTime(24 * HOUR);
			expect(emit).toHaveBeenCalledTimes(1);
			jest.advanceTimersByTime(24 * HOUR);
			expect(emit).toHaveBeenCalledTimes(2);

			const firstTriggerData = emit.mock.calls[0][0][0][0];
			expect(firstTriggerData.json).toEqual(
				expect.objectContaining({
					timestamp: '2023-12-29T13:34:56.789+01:00',
				}),
			);

			const secondTriggerData = emit.mock.calls[1][0][0][0];
			expect(secondTriggerData.json).toEqual(
				expect.objectContaining({
					timestamp: '2023-12-30T13:34:56.789+01:00',
				}),
			);
		});

		it('should emit when hours interval is more than 24', async () => {
			const { emit } = await testTriggerNode(ScheduleTrigger, {
				timezone,
				node: { parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 25 }] } } },
				workflowStaticData: { recurrenceRules: [] },
			});
			expect(emit).not.toHaveBeenCalled();
			jest.advanceTimersByTime(25 * HOUR);
			expect(emit).toHaveBeenCalledTimes(1);
			jest.advanceTimersByTime(25 * HOUR);
			expect(emit).toHaveBeenCalledTimes(2);

			const firstTriggerData = emit.mock.calls[0][0][0][0];
			expect(firstTriggerData.json).toEqual(
				expect.objectContaining({
					timestamp: '2023-12-29T14:34:56.789+01:00',
				}),
			);

			const secondTriggerData = emit.mock.calls[1][0][0][0];
			expect(secondTriggerData.json).toEqual(
				expect.objectContaining({
					timestamp: '2023-12-30T15:34:56.789+01:00',
				}),
			);
		});

		it('should emit when days interval is 5', async () => {
			const { emit } = await testTriggerNode(ScheduleTrigger, {
				timezone,
				node: { parameters: { rule: { interval: [{ field: 'days', daysInterval: 5 }] } } },
				workflowStaticData: { recurrenceRules: [] },
			});
			expect(emit).not.toHaveBeenCalled();
			jest.advanceTimersByTime(5 * DAY);
			expect(emit).toHaveBeenCalledTimes(1);
			jest.advanceTimersByTime(5 * DAY);
			expect(emit).toHaveBeenCalledTimes(2);
			const firstTriggerData = emit.mock.calls[0][0][0][0];
			expect(firstTriggerData.json).toEqual(
				expect.objectContaining({
					'Day of month': '29',
					Month: 'December',
				}),
			);

			const secondTriggerData = emit.mock.calls[1][0][0][0];
			expect(secondTriggerData.json).toEqual(
				expect.objectContaining({
					'Day of month': '03',
					Month: 'January',
				}),
			);
		});

		it('should emit when days interval is 1', async () => {
			const { emit } = await testTriggerNode(ScheduleTrigger, {
				timezone,
				node: { parameters: { rule: { interval: [{ field: 'days', daysInterval: 1 }] } } },
				workflowStaticData: { recurrenceRules: [] },
			});
			expect(emit).not.toHaveBeenCalled();
			jest.advanceTimersByTime(1 * DAY);
			expect(emit).toHaveBeenCalledTimes(1);
			jest.advanceTimersByTime(1 * DAY);
			expect(emit).toHaveBeenCalledTimes(2);
			const firstTriggerData = emit.mock.calls[0][0][0][0];
			expect(firstTriggerData.json).toEqual(
				expect.objectContaining({
					'Day of month': '29',
					Month: 'December',
				}),
			);

			const secondTriggerData = emit.mock.calls[1][0][0][0];
			expect(secondTriggerData.json).toEqual(
				expect.objectContaining({
					'Day of month': '30',
					Month: 'December',
				}),
			);
		});

		it('should emit on schedule defined as a cron expression', async () => {
			const { emit } = await testTriggerNode(ScheduleTrigger, {
				timezone,
				node: {
					parameters: {
						rule: {
							interval: [
								{
									field: 'cronExpression',
									expression: '0 */2 * * *', // every 2 hours
								},
							],
						},
					},
				},
				workflowStaticData: {},
			});

			expect(emit).not.toHaveBeenCalled();

			jest.advanceTimersByTime(2 * HOUR);
			expect(emit).toHaveBeenCalledTimes(1);

			jest.advanceTimersByTime(2 * HOUR);
			expect(emit).toHaveBeenCalledTimes(2);
		});

		it('should throw on invalid cron expressions', async () => {
			await expect(
				testTriggerNode(ScheduleTrigger, {
					timezone,
					node: {
						parameters: {
							rule: {
								interval: [
									{
										field: 'cronExpression',
										expression: '100 * * * *', // minute should be 0-59 -> invalid
									},
								],
							},
						},
					},
					workflowStaticData: {},
				}),
			).rejects.toBeInstanceOf(n8nWorkflow.NodeOperationError);
		});

		it('should emit when manually executed', async () => {
			const { emit, manualTriggerFunction } = await testTriggerNode(ScheduleTrigger, {
				mode: 'manual',
				timezone,
				node: { parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 3 }] } } },
				workflowStaticData: { recurrenceRules: [] },
			});

			await manualTriggerFunction?.();

			expect(emit).toHaveBeenCalledTimes(1);

			const firstTriggerData = emit.mock.calls[0][0][0][0];
			expect(firstTriggerData.json).toEqual({
				'Day of month': '28',
				'Day of week': 'Thursday',
				Hour: '13',
				Minute: '34',
				Month: 'December',
				'Readable date': 'December 28th 2023, 1:34:56 pm',
				'Readable time': '1:34:56 pm',
				Second: '56',
				Timezone: 'Europe/Berlin (UTC+01:00)',
				Year: '2023',
				timestamp: '2023-12-28T13:34:56.789+01:00',
			});
		});

		it('should throw on invalid cron expressions in manual mode', async () => {
			const { manualTriggerFunction } = await testTriggerNode(ScheduleTrigger, {
				mode: 'manual',
				timezone,
				node: {
					parameters: {
						rule: {
							interval: [
								{
									field: 'cronExpression',
									expression: '@daily *', // adding extra fields to shorthand not allowed -> invalid
								},
							],
						},
					},
				},
				workflowStaticData: {},
			});
			await expect(manualTriggerFunction?.()).rejects.toBeInstanceOf(
				n8nWorkflow.NodeOperationError,
			);
		});
	});
});
