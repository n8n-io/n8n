import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	uptimeRobotApiRequest,
} from './GenericFunctions';

import {
	monitorFields,
	monitorOperations,
} from './MonitorDescription';

import {
	alertContactFields,
	alertContactOperations,
} from './AlertContactDescription';

import {
	maintenanceWindowFields,
	maintenanceWindowOperations,
} from './MaintenanceWindowDescription';

import {
	publicStatusPageFields,
	publicStatusPageOperations,
} from './PublicStatusPageDescription';

import * as moment from 'moment';

export class UptimeRobot implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'UptimeRobot',
		name: 'uptimeRobot',
		icon: 'file:uptimerobot.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume UptimeRobot API',
		defaults: {
			name: 'UptimeRobot',
			color: '#3bd671',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'uptimeRobotApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Account',
						value: 'account',
					},
					{
						name: 'Alert Contact',
						value: 'alertContact',
					},
					{
						name: 'Maintenance Window',
						value: 'mwindow',
					},
					{
						name: 'Monitor',
						value: 'monitor',
					},
					{
						name: 'Public Status Page',
						value: 'psp',
					},
				],
				default: 'account',
				description: 'Resource to consume.',
			},
			/* -------------------------------------------------------------------------- */
			/*                                account:getAccountDetails					  */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'account',
						],
					},
				},
				options: [
					{
						name: 'Get Account Details',
						value: 'getAccountDetails',
						description: 'Retrieve account details (max number of monitors that can be added and number of up/down/paused monitors)',
					},
				],
				default: 'getAccountDetails',
				description: 'The operation to perform.',
			},
			/* -------------------------------------------------------------------------- */
			/*                                Monitor									  */
			/* -------------------------------------------------------------------------- */
			...monitorOperations,
			...monitorFields,
			/* -------------------------------------------------------------------------- */
			/*                                Alert Contact                               */
			/* -------------------------------------------------------------------------- */
			...alertContactOperations,
			...alertContactFields,
			/* -------------------------------------------------------------------------- */
			/*                                Maintenance Window                          */
			/* -------------------------------------------------------------------------- */
			...maintenanceWindowOperations,
			...maintenanceWindowFields,
			/* -------------------------------------------------------------------------- */
			/*                               Public Status Page                           */
			/* -------------------------------------------------------------------------- */
			...publicStatusPageOperations,
			...publicStatusPageFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData = [];
		const length = items.length;
		let responseData;
		for (let i = 0; i < length; i++) {
			try {
				const resource = this.getNodeParameter('resource', 0) as string;
				const operation = this.getNodeParameter('operation', 0) as string;
				let body: IDataObject = {};
				//https://uptimerobot.com/#methods
				if (resource === 'account') {
					if (operation === 'getAccountDetails') {
						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/getAccountDetails');
						responseData = responseData.account;
					}
				} else if (resource === 'monitor') {
					if (operation === 'create') {

						body = {
							friendly_name: this.getNodeParameter('friendly_name', i) as string,
							url: this.getNodeParameter('url', i) as string,
							type: this.getNodeParameter('type', i) as number,
						};

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/newMonitor', body);
						responseData = responseData.monitor;

					} else if (operation === 'delete') {

						body = {
							id: this.getNodeParameter('id', i) as string,
						};

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/deleteMonitor', body);
						responseData = responseData.monitor;

					} else if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filters = this.getNodeParameter('filters', i) as IDataObject;

						body = {
							...filters,
						};

						if (body.statuses) {
							body.statuses = (body.statuses as string[]).join('-');
						}

						if (body.types) {
							body.types = (body.types as string[]).join('-');
						}

						if (body.alert_contacts) {
							body.alert_contacts = 1;
						}
						if (body.logs) {
							body.logs = 1;
						}
						if (body.mwindow) {
							body.mwindows = 1;
						}
						if (body.response_times) {
							body.response_times = 1;
						}

						if (!returnAll) {
							body.limit = this.getNodeParameter('limit', i) as number;
						}

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/getMonitors', body);
						responseData = responseData.monitors;

					} else if (operation === 'reset') {

						body = {
							id: this.getNodeParameter('id', i) as string,
						};

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/resetMonitor', body);
						responseData = responseData.monitor;

					} else if (operation === 'update') {

						body = {
							id: this.getNodeParameter('id', i) as string,
							...this.getNodeParameter('updateFields', i) as IDataObject,
						};

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/editMonitor', body);
						responseData = responseData.monitor;

					}
				} else if (resource === 'alertContact') {
					if (operation === 'create') {

						body = {
							friendly_name: this.getNodeParameter('friendly_name', i) as string,
							value: this.getNodeParameter('value', i) as string,
							type: this.getNodeParameter('type', i) as number,
						};

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/newAlertContact', body);
						responseData = responseData.alertcontact;

					} else if (operation === 'delete') {

						body = {
							id: this.getNodeParameter('id', i) as string,
						};

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/deleteAlertContact', body);
						responseData = responseData.alert_contact;

					} else if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						body = {
							...this.getNodeParameter('filters', i) as IDataObject,
						};

						if (!returnAll) {
							body.limit = this.getNodeParameter('limit', i) as number;
						}

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/getAlertContacts', body);
						responseData = responseData.alert_contacts;

					} else if (operation === 'update') {

						body = {
							id: this.getNodeParameter('id', i) as string,
							...this.getNodeParameter('updateFields', i) as IDataObject,
						};

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/editAlertContact', body);
						responseData = responseData.alert_contact;

					}
				} else if (resource === 'mwindow') {
					if (operation === 'create') {
						const startTime = this.getNodeParameter('start_time', i) as string;
						const type = this.getNodeParameter('type', i) as number;

						const parsedStartTime = type === 1
							? moment(startTime).unix()
							: moment(startTime).format('HH:mm');

						body = {
							duration: this.getNodeParameter('duration', i) as number,
							friendly_name: this.getNodeParameter('friendly_name', i) as string,
							value: this.getNodeParameter('value', i) as string,
							start_time: parsedStartTime,
							type,
						};

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/newMWindow', body);
						responseData = responseData.mwindow;

					} else if (operation === 'delete') {

						body = {
							id: this.getNodeParameter('id', i) as string,
						};

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/deleteMWindow', body);
						responseData = { status: responseData.message };

					} else if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						body = {
							...this.getNodeParameter('filters', i) as IDataObject,
						};

						if (!returnAll) {
							body.limit = this.getNodeParameter('limit', i) as number;
						}

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/getMWindows', body);
						responseData = responseData.mwindows;

					} else if (operation === 'update') {

						body = {
							id: this.getNodeParameter('id', i) as string,
							duration: this.getNodeParameter('duration', i) as string,
							...this.getNodeParameter('updateFields', i) as IDataObject,
						};

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/editMWindow', body);
						responseData = responseData.mwindow;

					}
				} else if (resource === 'psp') {
					if (operation === 'create') {

						body = {
							friendly_name: this.getNodeParameter('friendly_name', i) as string,
							monitors: this.getNodeParameter('monitors', i) as string,
							...this.getNodeParameter('additionalFields', i) as IDataObject,
						};

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/newPSP', body);
						responseData = responseData.psp;

					} else if (operation === 'delete') {

						body = {
							id: this.getNodeParameter('id', i) as string,
						};

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/deletePSP', body);
						responseData = responseData.psp;

					} else if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						body = {
							...this.getNodeParameter('filters', i) as IDataObject,
						};

						if (!returnAll) {
							body.limit = this.getNodeParameter('limit', i) as number;
						}

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/getPSPs', body);
						responseData = responseData.psps;

					} else if (operation === 'update') {

						body = {
							id: this.getNodeParameter('id', i) as string,
							...this.getNodeParameter('updateFields', i) as IDataObject,
						};

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/editPSP', body);
						responseData = responseData.psp;

					}
				}

				Array.isArray(responseData)
					? returnData.push(...responseData)
					: returnData.push(responseData);

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
