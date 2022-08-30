import { ITriggerFunctions } from 'n8n-core';
import {
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	NodeOperationError,
} from 'n8n-workflow';

export class ScheduleTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Schedule Trigger',
		name: 'scheduleTrigger',
		icon: 'fa:hourglass',
		group: ['trigger', 'schedule'],
		version: 1,
		description: 'Triggers the workflow in a given schedule',
		eventTriggerDescription: '',
		activationMessage:
			'Your schedule trigger will now trigger executions on the schedule you have defined.',
		defaults: {
			name: 'Schedule Trigger',
			color: '#00FF00',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Add rule',
				name: 'rule',
				type: 'fixedCollection',
				default: 'hours',
				options: [
					{
						displayName: 'Seconds',
						name: 'seconds',
						values: [
							{
								name: 'value',
								displayName: 'Seconds between triggers',
								type: 'number',
								default: 30,
								description: 'Interval value',
							},
						],
					},
					{
						displayName: 'Minutes',
						name: 'minutes',
						values: [
							{
								name: 'value',
								displayName: 'Minutes between triggers',
								type: 'number',
								default: 5,
								description: 'Interval value',
							},
						],
					},
					{
						displayName: 'Hours',
						name: 'hours',
						values: [
							{
								name: 'value',
								displayName: 'Hours between triggers',
								type: 'number',
								default: 1,
								description: 'Interval value',
							},
							{
								name: 'triggerAtMinute',
								displayName: 'Trigger at Minute',
								type: 'number',
								default: 0,
								typeOptions: {
									minValue: 0,
									maxValue: 59,
								},
								description: 'The minute past the hour to trigger (0-59)',
							},
						],
					},
					{
						displayName: 'Days',
						name: 'days',
						default: 1,
						values: [
							{
								name: 'value',
								displayName: 'Days between triggers',
								type: 'number',
								default: 1,
								description: 'Interval value',
							},
							{
								name: 'Trigger at Hour',
								displayName: 'Trigger at Hour',
								type: 'options',
								default: 0,
								options: [
									{
										name: 'midnight',
										displayName: 'Midnight',
										value: 0,
									},
									{
										name: '1am',
										displayName: '1am',
										value: 1,
									},
								],
								description: 'The hour of the day to trigger',
							},
							{
								name: 'triggerAtMinute',
								displayName: 'Trigger at Minute',
								type: 'number',
								default: 0,
								typeOptions: {
									minValue: 0,
									maxValue: 59,
								},
								description: 'The minute past the hour to trigger (0-59)',
							},
						],
					},
					{
						displayName: 'Weeks',
						name: 'weeks',
						type: 'number',
						default: 0,
						values: [
							{
								name: 'value',
								displayName: 'Weeks between triggers',
								type: 'number',
								default: 1,
								description: 'Interval value',
							},
							{
								name: 'triggerAtDay',
								displayName: 'Trigger on Weekdays',
								type: 'multiOptions',
								typeOptions: {
									maxValue: 7,
								},
								options: [
									{
										name: 'Monday',
										displayName: 'Monday',
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
										value: 7,
									},
								],
								default: [7],
							},
							{
								name: 'Trigger at Hour',
								displayName: 'Trigger at Hour',
								type: 'options',
								default: 0,
								options: [
									{
										name: 'midnight',
										displayName: 'Midnight',
										value: 0,
									},
									{
										name: '1am',
										displayName: '1am',
										value: 1,
									},
								],
								description: 'The hour of the day to trigger',
							},
							{
								name: 'triggerAtMinute',
								displayName: 'Trigger at Minute',
								type: 'number',
								default: 0,
								description: 'The minute past the hour to trigger (0-59)',
							},
						],
					},
					{
						displayName: 'Months',
						name: 'months',
						type: 'number',
						default: 1,
						values: [
							{
								name: 'value',
								displayName: 'Months between triggers',
								type: 'number',
								default: 1,
								description: 'Would run every month unless specified otherwise',
							},
							{
								name: 'triggerAtDayOfMonth',
								displayName: 'Trigger at Day of Month',
								type: 'number',
								typeOptions: {
									minValue: 1,
									maxValue: 31,
								},
								default: 1,
								description: 'The day of the month to trigger (1-31)',
								hint: 'Will run on the last day of the month if there aren"t enough days in the month',
							},
							{
								name: 'Trigger at Hour',
								displayName: 'Trigger at Hour',
								type: 'options',
								default: 0,
								options: [
									{
										name: 'midnight',
										displayName: 'Midnight',
										value: 0,
									},
									{
										name: '1am',
										displayName: '1am',
										value: 1,
									},
								],
								description: 'The hour of the day to trigger',
							},
							{
								name: 'triggerAtMinute',
								displayName: 'Trigger at Minute',
								type: 'number',
								typeOptions: {
									minValue: 0,
									maxValue: 59,
								},
								default: 0,
								description: 'The minute past the hour to trigger (0-59)',
							},
						],
					},
					{
						displayName: 'Cron Expression',
						name: 'cronExpression',
						type: 'string',
						values: [
							{
								name: 'value',
								displayName: 'Expression',
								type: 'string',
								default: '',
								description: 'You can find help generating your cron expression <a>here</a>',
								hint: '[Second] [Minute] [Hour] [Day of Month] [Month] [Day of Week]',
							},
						],
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const executeTrigger = () => {
			this.emit([this.helpers.returnJsonArray([{}])]);
		};

		const intervalValue = 1000;

		const intervalObj = setInterval(executeTrigger, intervalValue);

		async function closeFunction() {
			clearInterval(intervalObj);
		}

		async function manualTriggerFunction() {
			executeTrigger();
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
