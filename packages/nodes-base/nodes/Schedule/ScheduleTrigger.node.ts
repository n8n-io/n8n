import type {
	ITriggerFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { CronJob } from 'cron';
import moment from 'moment';
import type { IRecurencyRule } from './SchedulerInterface';
import { convertToUnixFormat, recurencyCheck } from './GenericFunctions';

export class ScheduleTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Schedule Trigger',
		name: 'scheduleTrigger',
		icon: 'fa:clock',
		group: ['trigger', 'schedule'],
		version: [1, 1.1],
		description: 'Triggers the workflow on a given schedule',
		eventTriggerDescription: '',
		activationMessage:
			'Your schedule trigger will now trigger executions on the schedule you have defined.',
		defaults: {
			name: 'Schedule Trigger',
			color: '#31C49F',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName:
					'This workflow will run on the schedule you define here once you <a data-key="activate">activate</a> it.<br><br>For testing, you can also trigger it manually: by going back to the canvas and clicking ‘execute workflow’',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Trigger Rules',
				name: 'rule',
				placeholder: 'Add Rule',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {
					interval: [
						{
							field: 'days',
						},
					],
				},
				options: [
					{
						name: 'interval',
						displayName: 'Trigger Interval',
						values: [
							{
								displayName: 'Trigger Interval',
								name: 'field',
								type: 'options',
								default: 'days',
								// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
								options: [
									{
										name: 'Seconds',
										value: 'seconds',
									},
									{
										name: 'Minutes',
										value: 'minutes',
									},
									{
										name: 'Hours',
										value: 'hours',
									},
									{
										name: 'Days',
										value: 'days',
									},
									{
										name: 'Weeks',
										value: 'weeks',
									},
									{
										name: 'Months',
										value: 'months',
									},
									{
										name: 'Custom (Cron)',
										value: 'cronExpression',
									},
								],
							},
							{
								displayName: 'Seconds Between Triggers',
								name: 'secondsInterval',
								type: 'number',
								default: 30,
								displayOptions: {
									show: {
										field: ['seconds'],
									},
								},
								description: 'Number of seconds between each workflow trigger',
							},
							{
								displayName: 'Minutes Between Triggers',
								name: 'minutesInterval',
								type: 'number',
								default: 5,
								displayOptions: {
									show: {
										field: ['minutes'],
									},
								},
								description: 'Number of minutes between each workflow trigger',
							},
							{
								displayName: 'Hours Between Triggers',
								name: 'hoursInterval',
								type: 'number',
								displayOptions: {
									show: {
										field: ['hours'],
									},
								},
								default: 1,
								description: 'Number of hours between each workflow trigger',
							},
							{
								displayName: 'Days Between Triggers',
								name: 'daysInterval',
								type: 'number',
								displayOptions: {
									show: {
										field: ['days'],
									},
								},
								default: 1,
								description: 'Number of days between each workflow trigger',
							},
							{
								displayName: 'Weeks Between Triggers',
								name: 'weeksInterval',
								type: 'number',
								displayOptions: {
									show: {
										field: ['weeks'],
									},
								},
								default: 1,
								description: 'Would run every week unless specified otherwise',
							},
							{
								displayName: 'Months Between Triggers',
								name: 'monthsInterval',
								type: 'number',
								displayOptions: {
									show: {
										field: ['months'],
									},
								},
								default: 1,
								description: 'Would run every month unless specified otherwise',
							},
							{
								displayName: 'Trigger at Day of Month',
								name: 'triggerAtDayOfMonth',
								type: 'number',
								displayOptions: {
									show: {
										field: ['months'],
									},
								},
								typeOptions: {
									minValue: 1,
									maxValue: 31,
								},
								default: 1,
								description: 'The day of the month to trigger (1-31)',
								hint: 'If a month doesn’t have this day, the node won’t trigger',
							},
							{
								displayName: 'Trigger on Weekdays',
								name: 'triggerAtDay',
								type: 'multiOptions',
								displayOptions: {
									show: {
										field: ['weeks'],
									},
								},
								typeOptions: {
									maxValue: 7,
								},
								options: [
									{
										name: 'Monday',
										value: 1,
									},
									{
										name: 'Tuesday',
										value: 2,
									},
									{
										name: 'Wednesday',
										value: 3,
									},
									{
										name: 'Thursday',
										value: 4,
									},
									{
										name: 'Friday',
										value: 5,
									},

									{
										name: 'Saturday',
										value: 6,
									},
									{
										name: 'Sunday',
										value: 0,
									},
								],
								default: [0],
							},
							{
								displayName: 'Trigger at Hour',
								name: 'triggerAtHour',
								type: 'options',
								default: 0,
								displayOptions: {
									show: {
										field: ['days', 'weeks', 'months'],
									},
								},
								options: [
									{
										name: 'Midnight',
										displayName: 'Midnight',
										value: 0,
									},
									{
										name: '1am',
										displayName: '1am',
										value: 1,
									},
									{
										name: '2am',
										displayName: '2am',
										value: 2,
									},
									{
										name: '3am',
										displayName: '3am',
										value: 3,
									},
									{
										name: '4am',
										displayName: '4am',
										value: 4,
									},
									{
										name: '5am',
										displayName: '5am',
										value: 5,
									},
									{
										name: '6am',
										displayName: '6am',
										value: 6,
									},
									{
										name: '7am',
										displayName: '7am',
										value: 7,
									},
									{
										name: '8am',
										displayName: '8am',
										value: 8,
									},
									{
										name: '9am',
										displayName: '9am',
										value: 9,
									},
									{
										name: '10am',
										displayName: '10am',
										value: 10,
									},
									{
										name: '11am',
										displayName: '11am',
										value: 11,
									},
									{
										name: 'Noon',
										displayName: 'Noon',
										value: 12,
									},
									{
										name: '1pm',
										displayName: '1pm',
										value: 13,
									},
									{
										name: '2pm',
										displayName: '2pm',
										value: 14,
									},
									{
										name: '3pm',
										displayName: '3pm',
										value: 15,
									},
									{
										name: '4pm',
										displayName: '4pm',
										value: 16,
									},
									{
										name: '5pm',
										displayName: '5pm',
										value: 17,
									},
									{
										name: '6pm',
										displayName: '6pm',
										value: 18,
									},
									{
										name: '7pm',
										displayName: '7pm',
										value: 19,
									},
									{
										name: '8pm',
										displayName: '8pm',
										value: 20,
									},
									{
										name: '9pm',
										displayName: '9pm',
										value: 21,
									},
									{
										name: '10pm',
										displayName: '10pm',
										value: 22,
									},
									{
										name: '11pm',
										displayName: '11pm',
										value: 23,
									},
								],
								description: 'The hour of the day to trigger',
							},
							{
								displayName: 'Trigger at Minute',
								name: 'triggerAtMinute',
								type: 'number',
								default: 0,
								displayOptions: {
									show: {
										field: ['hours', 'days', 'weeks', 'months'],
									},
								},
								typeOptions: {
									minValue: 0,
									maxValue: 59,
								},
								description: 'The minute past the hour to trigger (0-59)',
							},
							{
								displayName:
									'You can find help generating your cron expression <a href="https://crontab.guru/examples.html" target="_blank">here</a>',
								name: 'notice',
								type: 'notice',
								displayOptions: {
									show: {
										field: ['cronExpression'],
									},
								},
								default: '',
							},
							{
								displayName: 'Expression',
								name: 'expression',
								type: 'string',
								default: '',
								placeholder: 'eg. 0 15 * 1 sun',
								displayOptions: {
									show: {
										field: ['cronExpression'],
									},
								},
								hint: 'Format: [Minute] [Hour] [Day of Month] [Month] [Day of Week]',
							},
						],
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const rule = this.getNodeParameter('rule', []) as IDataObject;
		const interval = rule.interval as IDataObject[];
		const timezone = this.getTimezone();
		const version = this.getNode().typeVersion;
		const cronJobs: CronJob[] = [];
		const intervalArr: NodeJS.Timeout[] = [];
		const staticData = this.getWorkflowStaticData('node') as {
			recurrencyRules: number[];
		};
		if (!staticData.recurrencyRules) {
			staticData.recurrencyRules = [];
		}
		const executeTrigger = async (recurency: IRecurencyRule) => {
			const resultData = {
				timestamp: moment.tz(timezone).toISOString(true),
				'Readable date': moment.tz(timezone).format('MMMM Do YYYY, h:mm:ss a'),
				'Readable time': moment.tz(timezone).format('h:mm:ss a'),
				'Day of week': moment.tz(timezone).format('dddd'),
				Year: moment.tz(timezone).format('YYYY'),
				Month: moment.tz(timezone).format('MMMM'),
				'Day of month': moment.tz(timezone).format('DD'),
				Hour: moment.tz(timezone).format('HH'),
				Minute: moment.tz(timezone).format('mm'),
				Second: moment.tz(timezone).format('ss'),
				Timezone: moment.tz(timezone).format('z Z'),
			};

			if (!recurency.activated) {
				this.emit([this.helpers.returnJsonArray([resultData])]);
			} else {
				if (recurencyCheck(recurency, staticData.recurrencyRules, timezone)) {
					this.emit([this.helpers.returnJsonArray([resultData])]);
				}
			}
		};

		for (let i = 0; i < interval.length; i++) {
			let intervalValue = 1000;
			if (interval[i].field === 'cronExpression') {
				if (version > 1) {
					// ! Remove this part if we use a cron library that follows unix cron expression
					convertToUnixFormat(interval[i]);
				}
				const cronExpression = interval[i].expression as string;
				try {
					const cronJob = new CronJob(
						cronExpression,
						async () => executeTrigger({ activated: false } as IRecurencyRule),
						undefined,
						true,
						timezone,
					);
					cronJobs.push(cronJob);
				} catch (error) {
					throw new NodeOperationError(this.getNode(), 'Invalid cron expression', {
						description: 'More information on how to build them at https://crontab.guru/',
					});
				}
			}

			if (interval[i].field === 'seconds') {
				const seconds = interval[i].secondsInterval as number;
				intervalValue *= seconds;
				const intervalObj = setInterval(
					async () => executeTrigger({ activated: false } as IRecurencyRule),
					intervalValue,
				) as NodeJS.Timeout;
				intervalArr.push(intervalObj);
			}

			if (interval[i].field === 'minutes') {
				const minutes = interval[i].minutesInterval as number;
				intervalValue *= 60 * minutes;
				const intervalObj = setInterval(
					async () => executeTrigger({ activated: false } as IRecurencyRule),
					intervalValue,
				) as NodeJS.Timeout;
				intervalArr.push(intervalObj);
			}

			if (interval[i].field === 'hours') {
				const hour = interval[i].hoursInterval as number;
				const minute = interval[i].triggerAtMinute?.toString() as string;
				const cronTimes: string[] = [minute, '*', '*', '*', '*'];
				const cronExpression: string = cronTimes.join(' ');
				if (hour === 1) {
					const cronJob = new CronJob(
						cronExpression,
						async () => executeTrigger({ activated: false } as IRecurencyRule),
						undefined,
						true,
						timezone,
					);
					cronJobs.push(cronJob);
				} else {
					const cronJob = new CronJob(
						cronExpression,
						async () =>
							executeTrigger({
								activated: true,
								index: i,
								intervalSize: hour,
								typeInterval: 'hours',
							} as IRecurencyRule),
						undefined,
						true,
						timezone,
					);
					cronJobs.push(cronJob);
				}
			}

			if (interval[i].field === 'days') {
				const day = interval[i].daysInterval as number;
				const hour = interval[i].triggerAtHour?.toString() as string;
				const minute = interval[i].triggerAtMinute?.toString() as string;
				const cronTimes: string[] = [minute, hour, '*', '*', '*'];
				const cronExpression: string = cronTimes.join(' ');
				if (day === 1) {
					const cronJob = new CronJob(
						cronExpression,
						async () => executeTrigger({ activated: false } as IRecurencyRule),
						undefined,
						true,
						timezone,
					);
					cronJobs.push(cronJob);
				} else {
					const cronJob = new CronJob(
						cronExpression,
						async () =>
							executeTrigger({
								activated: true,
								index: i,
								intervalSize: day,
								typeInterval: 'days',
							} as IRecurencyRule),
						undefined,
						true,
						timezone,
					);
					cronJobs.push(cronJob);
				}
			}

			if (interval[i].field === 'weeks') {
				const hour = interval[i].triggerAtHour?.toString() as string;
				const minute = interval[i].triggerAtMinute?.toString() as string;
				const week = interval[i].weeksInterval as number;
				const days = interval[i].triggerAtDay as IDataObject[];
				const day = days.length === 0 ? '*' : days.join(',');
				const cronTimes: string[] = [minute, hour, '*', '*', day];
				const cronExpression = cronTimes.join(' ');
				if (week === 1) {
					const cronJob = new CronJob(
						cronExpression,
						async () => executeTrigger({ activated: false } as IRecurencyRule),
						undefined,
						true,
						timezone,
					);
					cronJobs.push(cronJob);
				} else {
					const cronJob = new CronJob(
						cronExpression,
						async () =>
							executeTrigger({
								activated: true,
								index: i,
								intervalSize: week,
								typeInterval: 'weeks',
							} as IRecurencyRule),
						undefined,
						true,
						timezone,
					);
					cronJobs.push(cronJob);
				}
			}

			if (interval[i].field === 'months') {
				const month = interval[i].monthsInterval;
				const day = interval[i].triggerAtDayOfMonth?.toString() as string;
				const hour = interval[i].triggerAtHour?.toString() as string;
				const minute = interval[i].triggerAtMinute?.toString() as string;
				const cronTimes: string[] = [minute, hour, day, '*', '*'];
				const cronExpression: string = cronTimes.join(' ');
				if (month === 1) {
					const cronJob = new CronJob(
						cronExpression,
						async () => executeTrigger({ activated: false } as IRecurencyRule),
						undefined,
						true,
						timezone,
					);
					cronJobs.push(cronJob);
				} else {
					const cronJob = new CronJob(
						cronExpression,
						async () =>
							executeTrigger({
								activated: true,
								index: i,
								intervalSize: month,
								typeInterval: 'months',
							} as IRecurencyRule),
						undefined,
						true,
						timezone,
					);
					cronJobs.push(cronJob);
				}
			}
		}

		async function closeFunction() {
			for (const cronJob of cronJobs) {
				cronJob.stop();
			}
			for (const entry of intervalArr) {
				clearInterval(entry);
			}
		}

		async function manualTriggerFunction() {
			void executeTrigger({ activated: false } as IRecurencyRule);
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
