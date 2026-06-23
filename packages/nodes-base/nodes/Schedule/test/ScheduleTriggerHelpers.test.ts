import type { INode } from 'n8n-workflow';

import {
	buildScheduleDeduplicationKey,
	buildScheduleTriggerItem,
	compileScheduleTriggerRules,
	validateCompiledScheduleRule,
} from '../ScheduleTriggerHelpers';
import type { Rule, ScheduleInterval } from '../SchedulerInterface';

const node: INode = {
	id: 'node-1',
	name: 'Schedule Trigger',
	type: 'n8n-nodes-base.scheduleTrigger',
	typeVersion: 1.3,
	position: [0, 0],
	parameters: {},
};

describe('ScheduleTriggerHelpers', () => {
	it.each<[ScheduleInterval['field'], ScheduleInterval]>([
		['seconds', { field: 'seconds', secondsInterval: 15 }],
		['minutes', { field: 'minutes', minutesInterval: 5 }],
		['hours', { field: 'hours', hoursInterval: 18 }],
		['days', { field: 'days', daysInterval: 3 }],
		['weeks', { field: 'weeks', weeksInterval: 2, triggerAtDay: [1, 3], triggerAtHour: 9 }],
		['months', { field: 'months', monthsInterval: 2, triggerAtDayOfMonth: 10 }],
		['cronExpression', { field: 'cronExpression', expression: '0 5 * * * *' }],
	])('compiles %s schedule rules', (_field, interval) => {
		const [rule] = compileScheduleTriggerRules({
			node,
			rule: { interval: [interval] } as Rule,
			version: 1.3,
			workflowId: 'workflow-1',
		});

		expect(rule.index).toBe(0);
		expect(rule.interval).toBe(interval);
		expect(rule.cronExpression).toBeTruthy();
		expect(() => validateCompiledScheduleRule(node, rule)).not.toThrow();
	});

	it('throws for invalid custom cron expressions', () => {
		const interval = {
			field: 'cronExpression',
			expression: 'not cron',
		} as unknown as ScheduleInterval;
		const [rule] = compileScheduleTriggerRules({
			node,
			rule: { interval: [interval] },
			version: 1.3,
			workflowId: 'workflow-1',
		});

		expect(() => validateCompiledScheduleRule(node, rule)).toThrow('Invalid cron expression');
	});

	it('builds schedule trigger output for the canonical scheduled time', () => {
		expect(buildScheduleTriggerItem('Europe/Berlin', new Date('2024-01-02T03:04:05.000Z'))).toEqual(
			{
				'Day of month': '02',
				'Day of week': 'Tuesday',
				Hour: '04',
				Minute: '04',
				Month: 'January',
				'Readable date': 'January 2nd 2024, 4:04:05 am',
				'Readable time': '4:04:05 am',
				Second: '05',
				Timezone: 'Europe/Berlin (UTC+01:00)',
				Year: '2024',
				timestamp: '2024-01-02T04:04:05.000+01:00',
			},
		);
	});

	it('builds the distributed scheduler deduplication key', () => {
		expect(
			buildScheduleDeduplicationKey({
				workflowId: 'workflow-1',
				nodeId: 'node-1',
				scheduledTime: new Date('2024-01-02T03:04:05.000Z'),
			}),
		).toBe('workflow-1:node-1:2024-01-02T03:04:05.000Z');
	});
});
