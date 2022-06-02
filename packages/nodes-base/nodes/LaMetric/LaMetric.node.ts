import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';

import { Frame, GoalData, GoalFrame, ChartFrame, Sound, SoundCategory, Model, NotificationBody, DisplayBody, AudioBody } from './LaMetricApiModels'
import { constructRequestOptions } from './LaMetricFunctions'

interface GoalDataInput extends GoalData {
	icon: 'string'
}

interface ChartDataInput {
	chartData: 'string'
}

export class LaMetric implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LaMetric',
		name: 'lametric',
		icon: 'file:lametric.svg',
		group: ['output'],
		version: 1,
		description: 'Sends notifications to LaMetric',
		defaults: {
			name: 'LaMetric',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'laMetric',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Interaction',
				name: 'interaction',
				type: 'options',
				noDataExpression: true,
				required: true,
				options: [
					{
						name: 'Notifications',
						value: 'notifications',
						description: 'Interact with notifications',
					},
					{
						name: 'Display',
						value: 'display',
						description: 'Interact with the display',
					},
					{
						name: 'Audio',
						value: 'audio',
						description: 'Interact with audio',
					}
				],
				default: 'notifications',
			},
			{
				displayName: 'Notification interaction',
				name: 'notificationsInteraction',
				type: 'options',
				noDataExpression: true,
				required: true,
				displayOptions: {
					show: {
						interaction: [
							'notifications',
						],
					},
				},
				options: [
					{
						name: 'Send notifications',
						value: 'notificationsInteractionSend',
						description: 'Interact with notifications',
					},
					{
						name: 'Get notifications',
						value: 'notificationsInteractionGet',
						description: 'Returns the list of all notifications in the queue. Notifications with higher priority will be first in the list',
					},
					{
						name: 'Delete notification',
						value: 'notificationsInteractionDelete',
						description: 'Removes notification from queue or dismiss if it is visible',
					}
				],
				default: 'notificationsInteractionSend',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						notificationsInteraction: [
							'notificationsInteractionSend',
						],
						interaction: [
							'notifications',
						],
					},
				},
				options: [
					{
						name: 'Info',
						value: 'info',
					},
					{
						name: 'Warning',
						value: 'warning',
					},
					{
						name: 'Critical',
						value: 'critical',
					}
				],
				default: 'info',
			},
			{
				displayName: 'Cycles',
				name: 'cycles',
				type: 'number',
				required: true,
				displayOptions: {
					show: {
						notificationsInteraction: [
							'notificationsInteractionSend',
						],
						interaction: [
							'notifications',
						],
					},
				},
				default: 1,
			},
			{
				displayName: 'Icon Type',
				name: 'icon_type',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						notificationsInteraction: [
							'notificationsInteractionSend',
						],
						interaction: [
							'notifications',
						],
					},
				},
				options: [
					{
						name: 'None',
						value: 'none',
					},
					{
						name: 'Info',
						value: 'info',
					},
					{
						name: 'Alert',
						value: 'alert',
					}
				],
				default: 'none',
			},
			{
				displayName: 'Lifetime',
				name: 'lifeTime',
				type: 'number',
				required: false,
				displayOptions: {
					show: {
						notificationsInteraction: [
							'notificationsInteractionSend',
						],
						interaction: [
							'notifications',
						],
					},
				},
				default: '',
			},
			{
				displayName: 'Frames',
				name: 'frames',
				placeholder: 'Add frame',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				default: {},
				required: true,
				displayOptions: {
					show: {
						notificationsInteraction: [
							'notificationsInteractionSend',
						],
						interaction: [
							'notifications',
						],
					},
				},
				options: [
					{
						name: 'simple',
						displayName: 'Simple frame',
						values: [
							{
								name: 'icon',
								displayName: 'Icon',
								placeholder: '<icon id or base64 encoded binary>',
								type: 'string',
								default: '',
								description: 'icon id or base64 encoded binary (<a href="https://developer.lametric.com/icons">icon library</a>)',
							},
							{
								name: 'text',
								displayName: 'Text',
								placeholder: '<text>',
								type: 'string',
								default: '',
							},
						],
					},
					{
						name: 'goal',
						displayName: 'Goal frame',
						values: [
							{
								name: 'icon',
								displayName: 'Icon',
								placeholder: '<icon id or base64 encoded binary>',
								type: 'string',
								default: '',
								description: 'icon id or base64 encoded binary (<a href="https://developer.lametric.com/icons">icon library</a>)',
							},
							{
								name: 'start',
								displayName: 'Start',
								type: 'number',
								default: 0,
							},
							{
								name: 'current',
								displayName: 'Current',
								type: 'number',
								default: 50,
							},
							{
								name: 'end',
								displayName: 'End',
								type: 'number',
								default: 100,
							},
							{
								name: 'unit',
								displayName: 'Unit',
								type: 'string',
								default: '%',
							},
						],
					},
					{
						name: 'chart',
						displayName: 'Chart data frame',
						values: [
							{
								name: 'chartData',
								displayName: 'Chart data (only the first chart data frame will be displayed)',
								description: 'Comma separated list of numbers',
								type: 'string',
								placeholder: '1,10,15,20,6,9,11,16,22,24',
								default: ''
							}
						]
					},
				]
			},
			{
				displayName: 'Sound',
				name: 'sound',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						notificationsInteraction: [
							'notificationsInteractionSend',
						],
						interaction: [
							'notifications',
						],
					},
				},
			},
			{
				displayName: 'Sound category',
				name: 'soundCategory',
				type: 'options',
				displayOptions: {
					show: {
						sound: [
							true,
						],
					},
				},
				options: [
					{
						name: 'Notifications',
						value: 'notifications'
					},
					{
						name: 'Alarms',
						value: 'alarms'
					},
				],
				default: '',
			},
			{
				displayName: 'Sound ID',
				name: 'soundNotificationsId',
				type: 'options',
				displayOptions: {
					show: {
						soundCategory: [
							'notifications'
						]
					},
				},
				options: [
					{
						name: 'bicycle',
						value: 'bicycle'
					},
					{
						name: 'car',
						value: 'car'
					},
					{
						name: 'cash',
						value: 'cash'
					},
					{
						name: 'cat',
						value: 'cat'
					},
					{
						name: 'dog',
						value: 'dog'
					},
					{
						name: 'dog2',
						value: 'dog2'
					},
					{
						name: 'energy',
						value: 'energy'
					},
					{
						name: 'knock-knock',
						value: 'knock-knock'
					},
					{
						name: 'letter_email',
						value: 'letter_email'
					},
					{
						name: 'lose1',
						value: 'lose1'
					},
					{
						name: 'lose2',
						value: 'lose2'
					},
					{
						name: 'negative1',
						value: 'negative1'
					},
					{
						name: 'negative2',
						value: 'negative2'
					},
					{
						name: 'negative3',
						value: 'negative3'
					},
					{
						name: 'negative4',
						value: 'negative4'
					},
					{
						name: 'negative5',
						value: 'negative5'
					},
					{
						name: 'notification',
						value: 'notification'
					},
					{
						name: 'notification2',
						value: 'notification2'
					},
					{
						name: 'notification3',
						value: 'notification3'
					},
					{
						name: 'notification4',
						value: 'notification4'
					},
					{
						name: 'open_door',
						value: 'open_door'
					},
					{
						name: 'positive1',
						value: 'positive1'
					},
					{
						name: 'positive2',
						value: 'positive2'
					},
					{
						name: 'positive3',
						value: 'positive3'
					},
					{
						name: 'positive4',
						value: 'positive4'
					},
					{
						name: 'positive5',
						value: 'positive5'
					},
					{
						name: 'positive6',
						value: 'positive6'
					},
					{
						name: 'statistic',
						value: 'statistic'
					},
					{
						name: 'thunder',
						value: 'thunder'
					},
					{
						name: 'water1',
						value: 'water1'
					},
					{
						name: 'water2',
						value: 'water2'
					},
					{
						name: 'win',
						value: 'win'
					},
					{
						name: 'win2',
						value: 'win2'
					},
					{
						name: 'wind',
						value: 'wind'
					},
					{
						name: 'wind_short',
						value: 'wind_short'
					},
				],
				default: 'notification'
			},
			{
				displayName: 'Sound ID',
				name: 'soundAlarmsId',
				type: 'options',
				displayOptions: {
					show: {
						soundCategory: [
							'alarms'
						]
					},
				},
				options: [
					{
						name: 'alarm1',
						value: 'alarm1'
					},
					{
						name: 'alarm2',
						value: 'alarm2'
					},
					{
						name: 'alarm3',
						value: 'alarm3'
					},
					{
						name: 'alarm4',
						value: 'alarm4'
					},
					{
						name: 'alarm5',
						value: 'alarm5'
					},
					{
						name: 'alarm6',
						value: 'alarm6'
					},
					{
						name: 'alarm7',
						value: 'alarm7'
					},
					{
						name: 'alarm8',
						value: 'alarm8'
					},
					{
						name: 'alarm9',
						value: 'alarm9'
					},
					{
						name: 'alarm10',
						value: 'alarm10'
					},
					{
						name: 'alarm11',
						value: 'alarm11'
					},
					{
						name: 'alarm12',
						value: 'alarm12'
					},
					{
						name: 'alarm13',
						value: 'alarm13'
					},
				],
				default: 'alarm1'
			},
			{
				displayName: 'Repeat',
				name: 'soundRepeat',
				type: 'number',
				displayOptions: {
					show: {
						soundCategory: [
							'notifications',
							'alarms'
						]
					},
				},
				default: 1,
			},
			{
				displayName: 'Notification ID',
				name: 'notificationId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						notificationsInteraction: [
							'notificationsInteractionGet',
							'notificationsInteractionDelete',
						],
						interaction: [
							'notifications',
						],
					},
				},
			},
			{
				displayName: 'Display interaction',
				name: 'displayInteraction',
				type: 'options',
				noDataExpression: true,
				required: true,
				displayOptions: {
					show: {
						interaction: [
							'display',
						],
					},
				},
				options: [
					{
						name: 'Get display state',
						value: 'displayInteractionGet',
						description: 'Gets the state of the display',
					},
					{
						name: 'Update display state',
						value: 'displayInteractionUpdate',
						description: 'Updates display state',
					}
				],
				default: 'displayInteractionGet',
			},
			{
				displayName: 'Brightness',
				name: 'brightness',
				type: 'number',
				required: true,
				displayOptions: {
					show: {
						displayInteraction: [
							'displayInteractionUpdate',
						],
						interaction: [
							'display',
						],
					},
				},
				default: 100,
			},
			{
				displayName: 'Brightness mode',
				name: 'brightness_mode',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						displayInteraction: [
							'displayInteractionUpdate',
						],
						interaction: [
							'display',
						],
					},
				},
				options: [
					{
						name: 'Auto',
						value: 'auto'
					},
					{
						name: 'Manual',
						value: 'manual'
					},
				],
				default: 'auto',
			},
			{
				displayName: 'Audio interaction',
				name: 'audioInteraction',
				type: 'options',
				noDataExpression: true,
				required: true,
				displayOptions: {
					show: {
						interaction: [
							'audio',
						],
					},
				},
				options: [
					{
						name: 'Get audio state',
						value: 'audioInteractionGet',
						description: 'Returns audio state such as volume',
					},
					{
						name: 'Update audio state',
						value: 'audioInteractionUpdate',
						description: 'Updates audio state',
					}
				],
				default: 'audioInteractionGet',
			},
			{
				displayName: 'Volume',
				name: 'volume',
				type: 'number',
				required: true,
				displayOptions: {
					show: {
						audioInteraction: [
							'audioInteractionUpdate',
						],
						interaction: [
							'audio',
						],
					},
				},
				default: 100,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials('laMetric');
		const returnData: IDataObject[] = [];

		switch (this.getNodeParameter('interaction', 0) as string) {
			case 'notifications':
				switch (this.getNodeParameter('notificationsInteraction', 0) as string) {
					case 'notificationsInteractionSend':
						const simpleFrames = this.getNodeParameter('frames.simple', 0, []) as Frame[];

						const goalDataInput = this.getNodeParameter('frames.goal', 0, []) as GoalDataInput[];
						const goalFrames = goalDataInput.map<GoalFrame>(input => {
							return {
								icon: input.icon,
								goalData: {
									start: input.start,
									current: input.current,
									end: input.end,
									unit: input.unit
								}
							}
						})

						const chartDataInput = this.getNodeParameter('frames.chart', 0, []) as ChartDataInput[];
						const chartFrames = chartDataInput.map<ChartFrame>(input => {
							return {
								chartData: input.chartData.split(/\s*,\s*/).map(n => +n)
							}
						});

						const frames: Frame[] = simpleFrames.concat(goalFrames).concat(chartFrames);

						let sound: Sound | undefined;

						if (this.getNodeParameter('sound', 0) as boolean) {
							let soundId: string;
							const category = this.getNodeParameter('soundCategory', 0) as SoundCategory;

							if (category === 'notifications') {
								soundId = this.getNodeParameter('soundNotificationsId', 0) as string;
							} else {
								soundId = this.getNodeParameter('soundAlarmsId', 0) as string;
							}

							sound = {
								category: category,
								id: soundId,
								repeat: this.getNodeParameter('soundRepeat', 0) as number
							}
						} else {
							sound = undefined;
						}

						try {
							const body = {
								priority: this.getNodeParameter('priority', 0) as string,
								icon_type: this.getNodeParameter('icon_type', 0) as string,
								lifeTime: this.getNodeParameter('lifeTime', 0) as number,
								model: {
									frames: frames,
									sound: sound,
									cycles: this.getNodeParameter('cycles', 0) as number,
								} as Model
							} as NotificationBody

							const result = await this.helpers.request(constructRequestOptions(credentials, 'POST', 'notifications', body));
							returnData.push(result.body);
						} catch (error) {
							throw error;
						}

						break;
					case 'notificationsInteractionGet':
						try {
							const notificationId = this.getNodeParameter('notificationId', 0) as string;
							const result = await this.helpers.request(constructRequestOptions(credentials, 'GET', 'notifications'));
							returnData.push(result.body);
						} catch (error) {
							throw error;
						}

						break;
					case 'notificationsInteractionDelete':
						try {
							const notificationId = this.getNodeParameter('notificationId', 0) as string;
							const result = await this.helpers.request(constructRequestOptions(credentials, 'DELETE', 'notifications/' + notificationId));
							returnData.push(result.body);
						} catch (error) {
							throw error;
						}

						break;

					default:
						break;
				}

				break;

			case 'display':
				switch (this.getNodeParameter('displayInteraction', 0) as string) {
					case 'displayInteractionGet':
						try {
							const result = await this.helpers.request(constructRequestOptions(credentials, 'GET', 'display'));
							returnData.push(result.body);
						} catch (error) {
							throw error;
						}
					case 'displayInteractionUpdate':
						const body = {
							brightness: this.getNodeParameter('brightness', 0, 100) as number,
							brightness_mode: this.getNodeParameter('brightness_mode', 0, 'auto') as string,
						} as DisplayBody

						try {
							const result = await this.helpers.request(constructRequestOptions(credentials, 'PUT', 'display', body));
							returnData.push(result.body);
						} catch (error) {
							throw error;
						}
					default:
						break;
				}

			case 'audio':
				switch (this.getNodeParameter('audioInteraction', 0) as string) {
					case 'audioInteractionGet':
						try {
							const result = await this.helpers.request(constructRequestOptions(credentials, 'GET', 'audio'));
							returnData.push(result.body);
						} catch (error) {
							throw error;
						}
					case 'audioInteractionUpdate':
						const body = {
							volume: this.getNodeParameter('volume', 0, 100) as number,
						} as AudioBody

						try {
							const result = await this.helpers.request(constructRequestOptions(credentials, 'PUT', 'audio', body));
							returnData.push(result.body);
						} catch (error) {
							throw error;
						}
					default:
						break;
				}

			default:
				break;
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
