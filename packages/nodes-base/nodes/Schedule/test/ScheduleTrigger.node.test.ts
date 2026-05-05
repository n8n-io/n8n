import { ExecutionsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import * as n8nWorkflow from 'n8n-workflow';

import { testTriggerNode } from '@test/nodes/TriggerHelpers';

import { ScheduleTrigger } from '../ScheduleTrigger.node';

describe('ScheduleTrigger', () => {
	const HOUR = 60 * 60 * 1000;
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

			// Filler second/minute are derived deterministically from
			// `${workflowId ?? ''}:${nodeId}`. The default test setup
			// leaves both ids undefined, so the seed is ':undefined' and
			// resolves to second=34 / minute=52.
			const firstTriggerData = emit.mock.calls[0][0][0][0];
			expect(firstTriggerData.json).toEqual({
				'Day of month': '28',
				'Day of week': 'Thursday',
				Hour: '15',
				Minute: '52',
				Month: 'December',
				'Readable date': 'December 28th 2023, 3:52:34 pm',
				'Readable time': '3:52:34 pm',
				Second: '34',
				Timezone: 'Europe/Berlin (UTC+01:00)',
				Year: '2023',
				timestamp: '2023-12-28T15:52:34.000+01:00',
			});

			jest.setSystemTime(new Date(firstTriggerData.json.timestamp as string));

			jest.advanceTimersByTime(2 * HOUR);
			expect(emit).toHaveBeenCalledTimes(1);

			jest.advanceTimersByTime(HOUR);
			expect(emit).toHaveBeenCalledTimes(2);
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

		it('should emit when manually executed even with existing recurrence rules', async () => {
			const { emit, manualTriggerFunction } = await testTriggerNode(ScheduleTrigger, {
				mode: 'manual',
				timezone,
				node: { parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 2 }] } } },
				workflowStaticData: { recurrenceRules: [5] },
			});

			await manualTriggerFunction?.();

			expect(emit).toHaveBeenCalledTimes(1);
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

		describe('deduplication key', () => {
			const executionsConfig = Container.get(ExecutionsConfig);

			beforeEach(() => {
				executionsConfig.scheduledExecutionDeduplicationEnabled = false;
			});

			afterEach(() => {
				executionsConfig.scheduledExecutionDeduplicationEnabled = false;
			});

			it('should emit a deduplication key when the feature flag is enabled', async () => {
				executionsConfig.scheduledExecutionDeduplicationEnabled = true;

				const workflowId = 'wf-123';
				const nodeId = 'node-456';
				const { emit } = await testTriggerNode(ScheduleTrigger, {
					timezone,
					node: {
						id: nodeId,
						parameters: {
							rule: { interval: [{ field: 'cronExpression', expression: '0 */2 * * *' }] },
						},
					},
					workflowStaticData: {},
					workflow: { id: workflowId, active: true },
				});

				jest.advanceTimersByTime(2 * HOUR);

				expect(emit).toHaveBeenCalledTimes(1);
				const fourthArg = emit.mock.calls[0][3];
				expect(typeof fourthArg).toBe('string');
				// Deduplication key shape: `${workflowId}:${nodeId}:${scheduledT.toISOString()}`
				expect(fourthArg).toMatch(
					new RegExp(
						`^${workflowId}:${nodeId}:\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$`,
					),
				);
				// The ISO timestamp segment must match the cron-scheduled fire time exactly.
				const iso = (fourthArg as string).slice(`${workflowId}:${nodeId}:`.length);
				const scheduledT = new Date(iso);
				expect(scheduledT.getUTCMinutes()).toBe(0);
				expect(scheduledT.getUTCSeconds()).toBe(0);
				expect(scheduledT.getUTCMilliseconds()).toBe(0);
			});

			it('should not emit a deduplication key for manual executions', async () => {
				executionsConfig.scheduledExecutionDeduplicationEnabled = true;

				const { emit, manualTriggerFunction } = await testTriggerNode(ScheduleTrigger, {
					mode: 'manual',
					timezone,
					node: { parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 3 }] } } },
					workflowStaticData: { recurrenceRules: [] },
				});

				await manualTriggerFunction?.();

				expect(emit).toHaveBeenCalledTimes(1);
				expect(emit.mock.calls[0][3]).toBeUndefined();
			});
		});
	});
});
