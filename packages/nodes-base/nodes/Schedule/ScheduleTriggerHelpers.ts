import { CronTime, sendAt } from 'cron';
import moment from 'moment-timezone';
import type { IDataObject, INode, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { intervalToRecurrence, toCronExpression, validateInterval } from './GenericFunctions';
import type { IRecurrenceRule, Rule, ScheduleInterval } from './SchedulerInterface';

export interface CompiledScheduleRule {
	index: number;
	interval: ScheduleInterval;
	cronExpression: string;
	recurrence: IRecurrenceRule;
}

export function compileScheduleTriggerRules({
	node,
	rule,
	version,
	workflowId,
}: {
	node: INode;
	rule: Rule;
	version: number;
	workflowId?: string;
}) {
	const intervals = rule.interval ?? [];
	if (version >= 1.3) {
		for (let i = 0; i < intervals.length; i++) {
			validateInterval(node, i, intervals[i]);
		}
	}

	const nodeKey = `${workflowId ?? ''}:${node.id}`;
	return intervals.map((interval, index) => ({
		index,
		interval,
		cronExpression: toCronExpression(interval, nodeKey),
		recurrence: intervalToRecurrence(interval, index),
	}));
}

export function validateCompiledScheduleRule(node: INode, rule: CompiledScheduleRule) {
	try {
		sendAt(rule.cronExpression);
	} catch (error) {
		if (rule.interval.field === 'cronExpression') {
			throw new NodeOperationError(node, 'Invalid cron expression', {
				description: 'More information on how to build them at https://crontab.guru/',
			});
		}
		throw error;
	}
}

export function buildScheduleTriggerItem(timezone: string, referenceDate = new Date()) {
	const momentTz = moment.tz(referenceDate, timezone);
	return {
		timestamp: momentTz.toISOString(true),
		'Readable date': momentTz.format('MMMM Do YYYY, h:mm:ss a'),
		'Readable time': momentTz.format('h:mm:ss a'),
		'Day of week': momentTz.format('dddd'),
		Year: momentTz.format('YYYY'),
		Month: momentTz.format('MMMM'),
		'Day of month': momentTz.format('DD'),
		Hour: momentTz.format('HH'),
		Minute: momentTz.format('mm'),
		Second: momentTz.format('ss'),
		Timezone: `${timezone} (UTC${momentTz.format('Z')})`,
	};
}

export function buildScheduleTriggerData(
	timezone: string,
	returnJsonArray: (items: IDataObject[]) => INodeExecutionData[],
	referenceDate = new Date(),
) {
	return [returnJsonArray([buildScheduleTriggerItem(timezone, referenceDate)])];
}

export function buildScheduleDeduplicationKey({
	workflowId,
	nodeId,
	scheduledTime,
}: {
	workflowId: string;
	nodeId: string;
	scheduledTime: Date;
}) {
	return `${workflowId}:${nodeId}:${scheduledTime.toISOString()}`;
}

export function getNextScheduleTime(cronExpression: string, timezone: string, from = new Date()) {
	return new CronTime(cronExpression, timezone).getNextDateFrom(from).toJSDate();
}
