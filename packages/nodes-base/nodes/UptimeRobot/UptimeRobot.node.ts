import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

import { uptimeRobotApiRequest } from './GenericFunctions';

import { monitorFields, monitorOperations } from './MonitorDescription';

import { alertContactFields, alertContactOperations } from './AlertContactDescription';

import {
	maintenanceWindowFields,
	maintenanceWindowOperations,
} from './MaintenanceWindowDescription';

import { publicStatusPageFields, publicStatusPageOperations } from './PublicStatusPageDescription';

import moment from 'moment-timezone';

export class UptimeRobot implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'UptimeRobot',
		name: 'uptimeRobot',
		icon: 'file:uptimerobot.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume UptimeRobot API',
		defaults: {
			name: 'UptimeRobot',
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
				noDataExpression: true,
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
						value: 'maintenanceWindow',
					},
					{
						name: 'Monitor',
						value: 'monitor',
					},
					{
						name: 'Public Status Page',
						value: 'publicStatusPage',
					},
				],
				default: 'account',
			},
			/* -------------------------------------------------------------------------- */
			/*                                account:getAccountDetails					  */
			/* -------------------------------------------------------------------------- */
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['account'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get account details',
						action: 'Get an account',
					},
				],
				default: 'get',
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
		const timezone = this.getTimezone();
		for (let i = 0; i < length; i++) {
			try {
				const resource = this.getNodeParameter('resource', 0) as string;
				const operation = this.getNodeParameter('operation', 0) as string;
				let body: IDataObject = {};
				//https://uptimerobot.com/#methods
				if (resource === 'account') {
					if (operation === 'get') {
						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/getAccountDetails');
						responseData = responseData.account;
					}
				}

				if (resource === 'monitor') {
					if (operation === 'create') {
						body = {
							friendly_name: this.getNodeParameter('friendlyName', i) as string,
							url: this.getNodeParameter('url', i) as string,
							type: this.getNodeParameter('type', i) as number,
						};

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/newMonitor', body);
						responseData = responseData.monitor;
					}

					if (operation === 'delete') {
						body = {
							id: this.getNodeParameter('id', i) as string,
						};

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/deleteMonitor', body);
						responseData = responseData.monitor;
					}
					if (operation === 'get') {
						const monitors = this.getNodeParameter('id', i) as string;
						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/getMonitors', {
							monitors,
						});
						responseData = responseData.monitors;
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i);

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
							body.limit = this.getNodeParameter('limit', i);
						}

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/getMonitors', body);
						responseData = responseData.monitors;
					}

					if (operation === 'reset') {
						body = {
							id: this.getNodeParameter('id', i) as string,
						};

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/resetMonitor', body);
						responseData = responseData.monitor;
					}

					if (operation === 'update') {
						body = {
							id: this.getNodeParameter('id', i) as string,
							...(this.getNodeParameter('updateFields', i) as IDataObject),
						};

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/editMonitor', body);
						responseData = responseData.monitor;
					}
				}

				if (resource === 'alertContact') {
					if (operation === 'create') {
						body = {
							friendly_name: this.getNodeParameter('friendlyName', i) as string,
							value: this.getNodeParameter('value', i) as string,
							type: this.getNodeParameter('type', i) as number,
						};

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/newAlertContact', body);
						responseData = responseData.alertcontact;
					}
					if (operation === 'delete') {
						body = {
							id: this.getNodeParameter('id', i) as string,
						};

						responseData = await uptimeRobotApiRequest.call(
							this,
							'POST',
							'/deleteAlertContact',
							body,
						);
						responseData = responseData.alert_contact;
					}
					if (operation === 'get') {
						const id = this.getNodeParameter('id', i) as string;

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/getAlertContacts', {
							alert_contacts: id,
						});
						responseData = responseData.alert_contacts;
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);

						body = {
							...(this.getNodeParameter('filters', i) as IDataObject),
						};

						if (!returnAll) {
							body.limit = this.getNodeParameter('limit', i);
						}

						responseData = await uptimeRobotApiRequest.call(
							this,
							'POST',
							'/getAlertContacts',
							body,
						);
						responseData = responseData.alert_contacts;
					}
					if (operation === 'update') {
						body = {
							id: this.getNodeParameter('id', i) as string,
							...(this.getNodeParameter('updateFields', i) as IDataObject),
						};

						responseData = await uptimeRobotApiRequest.call(
							this,
							'POST',
							'/editAlertContact',
							body,
						);
						responseData = responseData.alert_contact;
					}
				}
				if (resource === 'maintenanceWindow') {
					if (operation === 'create') {
						const startTime = this.getNodeParameter('start_time', i) as string;
						const type = this.getNodeParameter('type', i) as number;

						const parsedStartTime =
							type === 1
								? moment.tz(startTime, timezone).unix()
								: moment.tz(startTime, timezone).format('HH:mm');

						body = {
							duration: this.getNodeParameter('duration', i) as number,
							friendly_name: this.getNodeParameter('friendlyName', i) as string,
							start_time: parsedStartTime,
							type,
						};

						if (type === 3) {
							body['value'] = this.getNodeParameter('weekDay', i) as number;
						}
						if (type === 4) {
							body['value'] = this.getNodeParameter('monthDay', i) as number;
						}

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/newMWindow', body);
						responseData = responseData.mwindow;
					}
					if (operation === 'delete') {
						body = {
							id: this.getNodeParameter('id', i) as string,
						};

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/deleteMWindow', body);
						responseData = { status: responseData.message };
					}
					if (operation === 'get') {
						const mwindows = this.getNodeParameter('id', i) as string;

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/getMWindows', {
							mwindows,
						});
						responseData = responseData.mwindows;
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);

						body = {
							...(this.getNodeParameter('filters', i) as IDataObject),
						};

						if (!returnAll) {
							body.limit = this.getNodeParameter('limit', i);
						}

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/getMWindows', body);
						responseData = responseData.mwindows;
					}
					if (operation === 'update') {
						body = {
							id: this.getNodeParameter('id', i) as string,
							duration: this.getNodeParameter('duration', i) as string,
							...(this.getNodeParameter('updateFields', i) as IDataObject),
						};

						if (body.type === 1 && body.start_time) {
							body.start_time = moment.tz(body.start_time, timezone).unix();
						} else {
							body.start_time = moment.tz(body.start_time, timezone).format('HH:mm');
						}

						if (body.type === 3) {
							body['value'] = body.weekDay;
							delete body.weekDay;
						}
						if (body.type === 4) {
							body['value'] = body.monthDay;
							delete body.monthDay;
						}
						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/editMWindow', body);
						responseData = responseData.mwindow;
					}
				}
				if (resource === 'publicStatusPage') {
					if (operation === 'create') {
						body = {
							friendly_name: this.getNodeParameter('friendlyName', i) as string,
							monitors: this.getNodeParameter('monitors', i) as string,
							...(this.getNodeParameter('additionalFields', i) as IDataObject),
						};

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/newPSP', body);
						responseData = responseData.psp;
					}
					if (operation === 'delete') {
						body = {
							id: this.getNodeParameter('id', i) as string,
						};

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/deletePSP', body);
						responseData = responseData.psp;
					}
					if (operation === 'get') {
						const psps = this.getNodeParameter('id', i) as string;

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/getPSPs', { psps });
						responseData = responseData.psps;
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);

						body = {
							...(this.getNodeParameter('filters', i) as IDataObject),
						};

						if (!returnAll) {
							body.limit = this.getNodeParameter('limit', i);
						}

						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/getPSPs', body);
						responseData = responseData.psps;
					}
					if (operation === 'update') {
						body = {
							id: this.getNodeParameter('id', i) as string,
							...(this.getNodeParameter('updateFields', i) as IDataObject),
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
