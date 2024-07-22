import * as n8nWorkflow from 'n8n-workflow';
import type { INode, ITriggerFunctions, Workflow } from 'n8n-workflow';
import { returnJsonArray } from 'n8n-core';
import { ScheduledTaskManager } from 'n8n-core/dist/ScheduledTaskManager';
import { mock } from 'jest-mock-extended';
import { ScheduleTrigger } from '../ScheduleTrigger.node';

describe('ScheduleTrigger', () => {
	Object.defineProperty(n8nWorkflow, 'randomInt', {
		value: (min: number, max: number) => Math.floor((min + max) / 2),
	});

	const HOUR = 60 * 60 * 1000;
	const mockDate = new Date('2023-12-28 12:34:56.789Z');
	const timezone = 'Europe/Berlin';
	jest.useFakeTimers();
	jest.setSystemTime(mockDate);

	const node = mock<INode>({ typeVersion: 1 });
	const workflow = mock<Workflow>({ timezone });
	const scheduledTaskManager = new ScheduledTaskManager();
	const helpers = mock<ITriggerFunctions['helpers']>({
		returnJsonArray,
		registerCron: (cronExpression, onTick) =>
			scheduledTaskManager.registerCron(workflow, cronExpression, onTick),
	});

	const triggerFunctions = mock<ITriggerFunctions>({
		helpers,
		getTimezone: () => timezone,
		getNode: () => node,
		getMode: () => 'trigger',
	});

	const scheduleTrigger = new ScheduleTrigger();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('trigger', () => {
		it('should emit on defined schedule', async () => {
			triggerFunctions.getNodeParameter.calledWith('rule', expect.anything()).mockReturnValueOnce({
				interval: [{ field: 'hours', hoursInterval: 3 }],
			});
			triggerFunctions.getWorkflowStaticData.mockReturnValueOnce({ recurrenceRules: [] });

			const result = await scheduleTrigger.trigger.call(triggerFunctions);
			// Assert that no manualTriggerFunction is returned
			expect(result).toEqual({});

			expect(triggerFunctions.emit).not.toHaveBeenCalled();

			jest.advanceTimersByTime(HOUR);
			expect(triggerFunctions.emit).not.toHaveBeenCalled();

			jest.advanceTimersByTime(2 * HOUR);
			expect(triggerFunctions.emit).toHaveBeenCalledTimes(1);

			const firstTriggerData = triggerFunctions.emit.mock.calls[0][0][0][0];
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
			expect(triggerFunctions.emit).toHaveBeenCalledTimes(1);
			jest.advanceTimersByTime(HOUR);
			expect(triggerFunctions.emit).toHaveBeenCalledTimes(2);
		});
	});
});
