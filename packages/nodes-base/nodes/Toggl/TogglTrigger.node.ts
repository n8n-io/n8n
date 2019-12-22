import { ITriggerFunctions } from 'n8n-core';
import {
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	IDataObject,
} from 'n8n-workflow';

import { CronJob } from 'cron';
import * as moment from 'moment';
import { togglApiRequest } from './GenericFunctions';

export class TogglTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Toggl',
		name: 'Toggl',
		icon: 'file:toggl.png',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Toggl events occure',
		defaults: {
			name: 'Toggl',
			color: '#00FF00',
		},
		credentials: [
			{
				name: 'togglApi',
				required: true,
			}
		],
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'New Time Entry',
						value: 'newTimeEntry',
					}
				],
				required: true,
				default: 'newTimeEntry',
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: 'Every Minute',
						value: 'everyMinute'
					},
					{
						name: 'Every Hour',
						value: 'everyHour'
					},
					{
						name: 'Every Day',
						value: 'everyDay'
					},
					{
						name: 'Every Week',
						value: 'everyWeek'
					},
					{
						name: 'Every Month',
						value: 'everyMonth'
					},
					{
						name: 'Custom',
						value: 'custom'
					},
				],
				default: 'everyDay',
				description: 'How often to trigger.',
			},
			{
				displayName: 'Hour',
				name: 'hour',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 23,
				},
				displayOptions: {
					hide: {
						mode: [
							'custom',
							'everyHour',
							'everyMinute'
						],
					},
				},
				default: 14,
				description: 'The hour of the day to trigger (24h format).',
			},
			{
				displayName: 'Minute',
				name: 'minute',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 59,
				},
				displayOptions: {
					hide: {
						mode: [
							'custom',
							'everyMinute'
						],
					},
				},
				default: 0,
				description: 'The minute of the day to trigger.',
			},
			{
				displayName: 'Day of Month',
				name: 'dayOfMonth',
				type: 'number',
				displayOptions: {
					show: {
						mode: [
							'everyMonth',
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 31,
				},
				default: 1,
				description: 'The day of the month to trigger.',
			},
			{
				displayName: 'Weekday',
				name: 'weekday',
				type: 'options',
				displayOptions: {
					show: {
						mode: [
							'everyWeek',
						],
					},
				},
				options: [
					{
						name: 'Monday',
						value: '1',
					},
					{
						name: 'Tuesday',
						value: '2',
					},
					{
						name: 'Wednesday',
						value: '3',
					},
					{
						name: 'Thursday',
						value: '4',
					},
					{
						name: 'Friday',
						value: '5',
					},
					{
						name: 'Saturday',
						value: '6',
					},
					{
						name: 'Sunday',
						value: '0',
					},
				],
				default: '1',
				description: 'The weekday to trigger.',
			},
			{
				displayName: 'Cron Expression',
				name: 'cronExpression',
				type: 'string',
				displayOptions: {
					show: {
						mode: [
							'custom',
						],
					},
				},
				default: '* * * * * *',
				description: 'Use custom cron expression. Values and ranges as follows:<ul><li>Seconds: 0-59</li><li>Minutes: 0 - 59</li><li>Hours: 0 - 23</li><li>Day of Month: 1 - 31</li><li>Months: 0 - 11 (Jan - Dec)</li><li>Day of Week: 0 - 6 (Sun - Sat)</li></ul>',
			},
		]
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const webhookData = this.getWorkflowStaticData('node');
		const mode = this.getNodeParameter('mode') as string;
		const event = this.getNodeParameter('event') as string;
		// Get all the trigger times
		let cronTime;
		let endpoint: string;
		//let parameterName: string;
		if (mode === 'custom') {
			const cronExpression = this.getNodeParameter('cronExpression') as string;
			cronTime = cronExpression as string;
		}
		if (mode === 'everyMinute') {
			cronTime = `* * * * *`;
		}
		if (mode === 'everyHour') {
			const minute = this.getNodeParameter('minute') as string;
			cronTime = `${minute} * * * *`;
		}
		if (mode === 'everyDay') {
			const hour = this.getNodeParameter('hour') as string;
			const minute = this.getNodeParameter('minute') as string;
			cronTime = `${minute} ${hour} * * *`;
		}
		if (mode === 'everyWeek') {
			const weekday = this.getNodeParameter('weekday') as string;
			const hour = this.getNodeParameter('hour') as string;
			const minute = this.getNodeParameter('minute') as string;
			cronTime = `${minute} ${hour} * * ${weekday}`;
		}
		if (mode === 'everyMonth') {
			const dayOfMonth = this.getNodeParameter('dayOfMonth') as string;
			const hour = this.getNodeParameter('hour') as string;
			const minute = this.getNodeParameter('minute') as string;
			cronTime = `${minute} ${hour} ${dayOfMonth} * *`;
		}
		if (event === 'newTimeEntry') {
			endpoint = '/time_entries';
		}

		const executeTrigger = async () => {
			const qs: IDataObject = {};
			let timeEntries = [];
			qs.start_date = webhookData.lastTimeChecked;
			qs.end_date = moment().format();
			try {
				timeEntries = await togglApiRequest.call(this, 'GET', endpoint, {}, qs);
			} catch (err) {
				throw new Error(`Toggl Trigger Error: ${err}`);
			}
			if (Array.isArray(timeEntries) && timeEntries.length !== 0) {
				this.emit([this.helpers.returnJsonArray(timeEntries)]);
			}
			webhookData.lastTimeChecked = qs.end_date;
		};

		const timezone = this.getTimezone();

		// Start the cron-jobs
		const cronJob = new CronJob(cronTime as string, executeTrigger, undefined, true, timezone);

		// Stop the cron-jobs
		async function closeFunction() {
			cronJob.stop();
		}

		async function manualTriggerFunction() {
			executeTrigger();
		}
		if (webhookData.lastTimeChecked === undefined) {
			webhookData.lastTimeChecked = moment().format();
		}
		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
