import * as n8nWorkflow from 'n8n-workflow';

import { testTriggerNode } from '@test/nodes/TriggerHelpers';

import { ScheduleTrigger } from '../ScheduleTrigger.node';

import { recurrenceCheck, validateInterval, toCronExpression } from '../GenericFunctions';
import type { IRecurrenceRule, ScheduleInterval } from '../SchedulerInterface';
import moment from 'moment-timezone';

describe('ScheduleTrigger', () => {
	const HOUR = 60 * 60 * 1000;
	const mockDate = new Date('2023-12-28 12:34:56.789Z');
	const timezone = 'Europe/Berlin';

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		jest.setSystemTime(mockDate);
		jest
			.spyOn(n8nWorkflow, 'randomInt')
			.mockImplementation((min, max) => Math.floor((min + max) / 2));
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

	describe('recurrenceCheck', () => {
		afterEach(() => {
			jest.restoreAllMocks();
		});

		describe('hour intervals', () => {
			it('should trigger correctly when crossing midnight', () => {
				const recurrence: IRecurrenceRule = {
					activated: true,
					index: 0,
					intervalSize: 2,
					typeInterval: 'hours',
				};
				const recurrenceRules: number[] = [23]; // Last execution at 11 PM

				// Mock current time to 1 AM (2 hours after 11 PM, crossing midnight)
				jest.spyOn(moment, 'tz').mockReturnValue({
					hour: () => 1,
				} as any);

				const result = recurrenceCheck(recurrence, recurrenceRules, timezone);

				expect(result).toBe(true);
				expect(recurrenceRules[0]).toBe(1);
			});

			it('should not trigger before interval elapses across midnight', () => {
				const recurrence: IRecurrenceRule = {
					activated: true,
					index: 0,
					intervalSize: 3,
					typeInterval: 'hours',
				};
				const recurrenceRules: number[] = [23]; // Last execution at 11 PM

				// Mock current time to 1 AM (only 2 hours elapsed)
				jest.spyOn(moment, 'tz').mockReturnValue({
					hour: () => 1,
				} as any);

				const result = recurrenceCheck(recurrence, recurrenceRules, timezone);

				expect(result).toBe(false);
				expect(recurrenceRules[0]).toBe(23);
			});
		});

		describe('day intervals', () => {
			it('should trigger correctly when crossing year boundary', () => {
				const recurrence: IRecurrenceRule = {
					activated: true,
					index: 0,
					intervalSize: 2,
					typeInterval: 'days',
				};
				const recurrenceRules: number[] = [365]; // Last day of non-leap year (Dec 31)

				// Mock current time to Jan 2 of next year (day 2)
				jest.spyOn(moment, 'tz').mockReturnValue({
					dayOfYear: () => 2,
					year: () => 2024,
					clone: () => ({
						year: () => ({
							isLeapYear: () => false, // 2023 is not a leap year
						}),
					}),
				} as any);

				const result = recurrenceCheck(recurrence, recurrenceRules, timezone);

				expect(result).toBe(true);
				expect(recurrenceRules[0]).toBe(2);
			});

			it('should handle leap years correctly', () => {
				const recurrence: IRecurrenceRule = {
					activated: true,
					index: 0,
					intervalSize: 2,
					typeInterval: 'days',
				};
				const recurrenceRules: number[] = [366]; // Last day of leap year (Dec 31)

				// Mock current time to Jan 2 of next year
				jest.spyOn(moment, 'tz').mockReturnValue({
					dayOfYear: () => 2,
					year: () => 2025,
					clone: () => ({
						year: () => ({
							isLeapYear: () => true, // 2024 was a leap year
						}),
					}),
				} as any);

				const result = recurrenceCheck(recurrence, recurrenceRules, timezone);

				expect(result).toBe(true);
				expect(recurrenceRules[0]).toBe(2);
			});

			it('should not trigger before interval elapses', () => {
				const recurrence: IRecurrenceRule = {
					activated: true,
					index: 0,
					intervalSize: 3,
					typeInterval: 'days',
				};
				const recurrenceRules: number[] = [100];

				// Mock current time to day 102 (only 2 days elapsed)
				jest.spyOn(moment, 'tz').mockReturnValue({
					dayOfYear: () => 102,
					year: () => 2024,
					clone: () => ({
						year: () => ({
							isLeapYear: () => false,
						}),
					}),
				} as any);

				const result = recurrenceCheck(recurrence, recurrenceRules, timezone);

				expect(result).toBe(false);
				expect(recurrenceRules[0]).toBe(100);
			});
		});

		describe('week intervals', () => {
			it('should trigger correctly when crossing year boundary', () => {
				const recurrence: IRecurrenceRule = {
					activated: true,
					index: 0,
					intervalSize: 2,
					typeInterval: 'weeks',
				};
				const recurrenceRules: number[] = [52]; // Last week of year

				// Mock current time to week 2 of next year
				jest.spyOn(moment, 'tz').mockReturnValue({
					isoWeek: () => 2,
					isoWeekYear: () => 2024,
					clone: () => ({
						isoWeekYear: () => ({
							isoWeeksInYear: () => 52,
						}),
					}),
				} as any);

				const result = recurrenceCheck(recurrence, recurrenceRules, timezone);

				expect(result).toBe(true);
				expect(recurrenceRules[0]).toBe(2);
			});

			it('should not trigger on same week when interval is 1', () => {
				const recurrence: IRecurrenceRule = {
					activated: true,
					index: 0,
					intervalSize: 1,
					typeInterval: 'weeks',
				};
				const recurrenceRules: number[] = [5]; // Week 5

				// Mock current time to same week 5
				jest.spyOn(moment, 'tz').mockReturnValue({
					isoWeek: () => 5,
					isoWeekYear: () => 2024,
					clone: () => ({
						isoWeekYear: () => ({
							isoWeeksInYear: () => 52,
						}),
					}),
				} as any);

				const result = recurrenceCheck(recurrence, recurrenceRules, timezone);

				// Should not trigger again in the same week - cron handles individual days
				expect(result).toBe(false);
				expect(recurrenceRules[0]).toBe(5);
			});

			it('should trigger when moving to next week with interval of 1', () => {
				const recurrence: IRecurrenceRule = {
					activated: true,
					index: 0,
					intervalSize: 1,
					typeInterval: 'weeks',
				};
				const recurrenceRules: number[] = [5]; // Week 5

				// Mock current time to week 6
				jest.spyOn(moment, 'tz').mockReturnValue({
					isoWeek: () => 6,
					isoWeekYear: () => 2024,
					clone: () => ({
						isoWeekYear: () => ({
							isoWeeksInYear: () => 52,
						}),
					}),
				} as any);

				const result = recurrenceCheck(recurrence, recurrenceRules, timezone);

				expect(result).toBe(true);
				expect(recurrenceRules[0]).toBe(6);
			});

			it('should not trigger before interval elapses', () => {
				const recurrence: IRecurrenceRule = {
					activated: true,
					index: 0,
					intervalSize: 3,
					typeInterval: 'weeks',
				};
				const recurrenceRules: number[] = [10];

				// Mock current time to week 12 (only 2 weeks elapsed)
				jest.spyOn(moment, 'tz').mockReturnValue({
					isoWeek: () => 12,
					isoWeekYear: () => 2024,
					clone: () => ({
						isoWeekYear: () => ({
							isoWeeksInYear: () => 52,
						}),
					}),
				} as any);

				const result = recurrenceCheck(recurrence, recurrenceRules, timezone);

				expect(result).toBe(false);
				expect(recurrenceRules[0]).toBe(10);
			});
		});

		describe('month intervals', () => {
			it('should trigger correctly when crossing year boundary', () => {
				const recurrence: IRecurrenceRule = {
					activated: true,
					index: 0,
					intervalSize: 2,
					typeInterval: 'months',
				};
				const recurrenceRules: number[] = [11]; // December (0-indexed)

				// Mock current time to February of next year (month 1)
				jest.spyOn(moment, 'tz').mockReturnValue({
					month: () => 1,
				} as any);

				const result = recurrenceCheck(recurrence, recurrenceRules, timezone);

				expect(result).toBe(true);
				expect(recurrenceRules[0]).toBe(1);
			});

			it('should not trigger before interval elapses across year boundary', () => {
				const recurrence: IRecurrenceRule = {
					activated: true,
					index: 0,
					intervalSize: 3,
					typeInterval: 'months',
				};
				const recurrenceRules: number[] = [11]; // December

				// Mock current time to January of next year (only 1 month elapsed)
				jest.spyOn(moment, 'tz').mockReturnValue({
					month: () => 0,
				} as any);

				const result = recurrenceCheck(recurrence, recurrenceRules, timezone);

				expect(result).toBe(false);
				expect(recurrenceRules[0]).toBe(11);
			});

			it('should not trigger before interval elapses within same year', () => {
				const recurrence: IRecurrenceRule = {
					activated: true,
					index: 0,
					intervalSize: 3,
					typeInterval: 'months',
				};
				const recurrenceRules: number[] = [3]; // April

				// Mock current time to June (only 2 months elapsed)
				jest.spyOn(moment, 'tz').mockReturnValue({
					month: () => 5,
				} as any);

				const result = recurrenceCheck(recurrence, recurrenceRules, timezone);

				expect(result).toBe(false);
				expect(recurrenceRules[0]).toBe(3);
			});
		});

		describe('first execution', () => {
			it('should trigger on first execution for hours', () => {
				const recurrence: IRecurrenceRule = {
					activated: true,
					index: 0,
					intervalSize: 2,
					typeInterval: 'hours',
				};
				const recurrenceRules: number[] = [];

				jest.spyOn(moment, 'tz').mockReturnValue({
					hour: () => 10,
				} as any);

				const result = recurrenceCheck(recurrence, recurrenceRules, timezone);

				expect(result).toBe(true);
				expect(recurrenceRules[0]).toBe(10);
			});

			it('should trigger on first execution for days', () => {
				const recurrence: IRecurrenceRule = {
					activated: true,
					index: 0,
					intervalSize: 2,
					typeInterval: 'days',
				};
				const recurrenceRules: number[] = [];

				jest.spyOn(moment, 'tz').mockReturnValue({
					dayOfYear: () => 150,
					year: () => 2024,
					clone: () => ({
						year: () => ({
							isLeapYear: () => false,
						}),
					}),
				} as any);

				const result = recurrenceCheck(recurrence, recurrenceRules, timezone);

				expect(result).toBe(true);
				expect(recurrenceRules[0]).toBe(150);
			});
		});

		it('should return true when recurrence is not activated', () => {
			const recurrence: IRecurrenceRule = {
				activated: false,
			};
			const recurrenceRules: number[] = [];

			const result = recurrenceCheck(recurrence, recurrenceRules, timezone);

			expect(result).toBe(true);
		});

		it('should return false when intervalSize is 0', () => {
			const recurrence: IRecurrenceRule = {
				activated: true,
				index: 0,
				intervalSize: 0,
				typeInterval: 'hours',
			};
			const recurrenceRules: number[] = [];

			const result = recurrenceCheck(recurrence, recurrenceRules, timezone);

			expect(result).toBe(false);
		});

		it('should return false when intervalSize is negative', () => {
			const recurrence: IRecurrenceRule = {
				activated: true,
				index: 0,
				intervalSize: -1,
				typeInterval: 'hours',
			};
			const recurrenceRules: number[] = [];

			const result = recurrenceCheck(recurrence, recurrenceRules, timezone);

			expect(result).toBe(false);
		});
	});

	describe('validateInterval', () => {
		const node = {} as n8nWorkflow.INode;

		it('should validate weekly trigger days are in range 0-6', () => {
			const interval: ScheduleInterval = {
				field: 'weeks',
				weeksInterval: 1,
				triggerAtDay: [0, 7], // 7 is invalid
				triggerAtHour: 9,
				triggerAtMinute: 0,
			};

			try {
				validateInterval(node, 0, interval);
				fail('Expected validation to throw an error');
			} catch (error) {
				expect(error).toBeInstanceOf(n8nWorkflow.NodeOperationError);
				expect((error as n8nWorkflow.NodeOperationError).description).toBe(
					'Days must be in range 0-6',
				);
			}
		});

		it('should validate weekly trigger days with negative values', () => {
			const interval: ScheduleInterval = {
				field: 'weeks',
				weeksInterval: 1,
				triggerAtDay: [-1, 3], // -1 is invalid
				triggerAtHour: 9,
				triggerAtMinute: 0,
			};

			try {
				validateInterval(node, 0, interval);
				fail('Expected validation to throw an error');
			} catch (error) {
				expect(error).toBeInstanceOf(n8nWorkflow.NodeOperationError);
				expect((error as n8nWorkflow.NodeOperationError).description).toBe(
					'Days must be in range 0-6',
				);
			}
		});

		it('should allow valid weekly trigger days', () => {
			const interval: ScheduleInterval = {
				field: 'weeks',
				weeksInterval: 1,
				triggerAtDay: [0, 1, 2, 3, 4, 5, 6], // All valid
				triggerAtHour: 9,
				triggerAtMinute: 0,
			};

			expect(() => validateInterval(node, 0, interval)).not.toThrow();
		});

		it('should validate weeks interval is larger than 0', () => {
			const interval: ScheduleInterval = {
				field: 'weeks',
				weeksInterval: 0,
				triggerAtDay: [1],
				triggerAtHour: 9,
				triggerAtMinute: 0,
			};

			try {
				validateInterval(node, 0, interval);
				fail('Expected validation to throw an error');
			} catch (error) {
				expect(error).toBeInstanceOf(n8nWorkflow.NodeOperationError);
				expect((error as n8nWorkflow.NodeOperationError).description).toBe(
					'Weeks must be larger than 0',
				);
			}
		});

		it('should validate triggerAtHour is in range 0-23', () => {
			const interval: ScheduleInterval = {
				field: 'days',
				daysInterval: 1,
				triggerAtHour: 24, // Invalid
				triggerAtMinute: 0,
			};

			try {
				validateInterval(node, 0, interval);
				fail('Expected validation to throw an error');
			} catch (error) {
				expect(error).toBeInstanceOf(n8nWorkflow.NodeOperationError);
				expect((error as n8nWorkflow.NodeOperationError).description).toBe(
					'Hour must be in range 0-23',
				);
			}
		});

		it('should validate triggerAtMinute is in range 0-59', () => {
			const interval: ScheduleInterval = {
				field: 'hours',
				hoursInterval: 1,
				triggerAtMinute: 60, // Invalid
			};

			try {
				validateInterval(node, 0, interval);
				fail('Expected validation to throw an error');
			} catch (error) {
				expect(error).toBeInstanceOf(n8nWorkflow.NodeOperationError);
				expect((error as n8nWorkflow.NodeOperationError).description).toBe(
					'Minute must be in range 0-59',
				);
			}
		});

		it('should validate triggerAtDayOfMonth is in range 1-31', () => {
			const interval: ScheduleInterval = {
				field: 'months',
				monthsInterval: 1,
				triggerAtDayOfMonth: 32, // Invalid
				triggerAtHour: 9,
				triggerAtMinute: 0,
			};

			try {
				validateInterval(node, 0, interval);
				fail('Expected validation to throw an error');
			} catch (error) {
				expect(error).toBeInstanceOf(n8nWorkflow.NodeOperationError);
				expect((error as n8nWorkflow.NodeOperationError).description).toBe(
					'Day of month must be in range 1-31',
				);
			}
		});
	});

	describe('toCronExpression', () => {
		it('should use randomInt(1, 32) for dayOfMonth when not specified', () => {
			const interval: ScheduleInterval = {
				field: 'months',
				monthsInterval: 1,
				triggerAtHour: 9,
				triggerAtMinute: 0,
			};

			const cronExpr = toCronExpression(interval);
			const parts = cronExpr.split(' ');
			const dayOfMonth = parseInt(parts[3]);

			// With the mocked randomInt: (1 + 32) / 2 = 16.5 -> floor = 16
			expect(dayOfMonth).toBe(16);
		});
	});
});
