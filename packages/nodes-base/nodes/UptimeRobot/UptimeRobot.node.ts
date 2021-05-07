import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';
import {
	uptimeRobotApiRequest,
} from './GenericFunctions';
import {
	monitorOperations,
	monitorFields,
} from './MonitorDescription';
import {
	alertContactOperations,
	alertContactFields,
} from './AlertContactDescription';
import {
	maintenanceWindowsOperations,
	maintenanceWindowsFields,
} from './MaintenanceWindowsDescription';
import {
	publicStatusPagesOperations,
	publicStatusPagesFields,
} from './PublicStatusPagesDescription copy';
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
						name: 'Maintenance Windows',
						value: 'mwindows',
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
			/*                                Maintenance Windows                         */
			/* -------------------------------------------------------------------------- */
			...maintenanceWindowsOperations,
			...maintenanceWindowsFields,
			/* -------------------------------------------------------------------------- */
			/*                               Public Status Pages                          */
			/* -------------------------------------------------------------------------- */
			...publicStatusPagesOperations,
			...publicStatusPagesFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		for (let i = 0; i < length; i++) {
		 
			const resource = this.getNodeParameter('resource', 0) as string;
			const operation = this.getNodeParameter('operation', 0) as string;
			let body:IDataObject = {};
			//https://uptimerobot.com/#methods
			if (resource === 'account') {
				if (operation === 'getAccountDetails') {
					try {
						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/getAccountDetails');
						responseData = responseData.account;
					} catch (error) {
						throw new NodeApiError(this.getNode(), error);
					}
				}
			}
			if (resource === 'monitor') {
				if (operation === 'create') {
					const friendly_name = this.getNodeParameter('friendly_name', i) as string;
					const url = this.getNodeParameter('url', i) as string;
					const type = this.getNodeParameter('type', i) as number;

					body = {
						friendly_name,
						url,
						type,
					};

					try {
						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/newMonitor', body);
						console.log({responseData});
						if (responseData.stat !== 'ok') {
							throw new Error(responseData.error.message);
						}
						responseData = responseData.monitor;
					} catch (error) {
						throw new NodeApiError(this.getNode(), error);
					}
				}
				if (operation === 'delete') {
					const id = this.getNodeParameter('id', i) as string;

					body = {
						id,
					};

					try {
						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/deleteMonitor', body);
						console.log({responseData});
						if (responseData.stat !== 'ok') {
							throw new Error(responseData.error.message);
						}
						responseData = responseData.monitor;
					} catch (error) {
						throw new NodeApiError(this.getNode(), error);
					}
				}
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const filters = this.getNodeParameter('filters', i) as IDataObject;

					body = {
						...filters
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
					if (body.mwindows) {
						body.mwindows = 1;
					}
					if (body.response_times) {
						body.response_times = 1;
					}

					if (!returnAll){
						body.limit = this.getNodeParameter('limit', i) as number;
					}

					try {
						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/getMonitors', body);
						console.log({responseData});
						if (responseData.stat !== 'ok') {
							throw new Error(responseData.error.message);
						}
						responseData = responseData.monitors;
					} catch (error) {
						throw new NodeApiError(this.getNode(), error);
					}
				}
				if (operation === 'reset') {
					const id = this.getNodeParameter('id', i) as string;

					body = {
						id,
					};

					try {
						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/resetMonitor', body);
						console.log({responseData});
						if (responseData.stat !== 'ok') {
							throw new Error(responseData.error.message);
						}
						responseData = responseData.monitor;
					} catch (error) {
						throw new NodeApiError(this.getNode(), error);
					}
				}
				if (operation === 'update') {
					const id = this.getNodeParameter('id', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					body = {
						id,
						...updateFields
					};

					try {
						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/editMonitor', body);
						console.log({responseData});
						if (responseData.stat !== 'ok') {
							throw new Error(responseData.error.message);
						}
						responseData = responseData.monitor;
					} catch (error) {
						throw new NodeApiError(this.getNode(), error);
					}
				}
			}
			if (resource === 'alertContact') {
				if (operation === 'create') {
					const friendly_name = this.getNodeParameter('friendly_name', i) as string;
					const value = this.getNodeParameter('value', i) as string;
					const type = this.getNodeParameter('type', i) as number;

					body = {
						friendly_name,
						value,
						type,
					};

					try {
						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/newAlertContact', body);
						console.log({responseData});
						if (responseData.stat !== 'ok') {
							throw new Error(responseData.error.message);
						}
						responseData = responseData.alertcontact;
					} catch (error) {
						throw new NodeApiError(this.getNode(), error);
					}
				}
				if (operation === 'delete') {
					const id = this.getNodeParameter('id', i) as string;

					body = {
						id,
					};

					try {
						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/deleteAlertContact', body);
						console.log({responseData});
						if (responseData.stat !== 'ok') {
							throw new Error(responseData.error.message);
						}
						responseData = responseData.alert_contact;
					} catch (error) {
						throw new NodeApiError(this.getNode(), error);
					}
				}
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const filters = this.getNodeParameter('filters', i) as IDataObject;

					body = {
						...filters
					};

					if (!returnAll){
						body.limit = this.getNodeParameter('limit', i) as number;
					}

					try {
						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/getAlertContacts', body);
						console.log({responseData});
						if (responseData.stat !== 'ok') {
							throw new Error(responseData.error.message);
						}
						responseData = responseData.alert_contacts;
					} catch (error) {
						throw new NodeApiError(this.getNode(), error);
					}
				}
				if (operation === 'update') {
					const id = this.getNodeParameter('id', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					body = {
						id,
						...updateFields
					};

					try {
						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/editAlertContact', body);
						console.log({responseData});
						if (responseData.stat !== 'ok') {
							throw new Error(responseData.error.message);
						}
						responseData = responseData.alert_contact;
					} catch (error) {
						throw new NodeApiError(this.getNode(), error);
					}
				}
			}
			if (resource === 'mwindows') {
				if (operation === 'create') {
					const friendly_name = this.getNodeParameter('friendly_name', i) as string;
					const value = this.getNodeParameter('value', i) as string;
					const type = this.getNodeParameter('type', i) as number;
					const duration = this.getNodeParameter('duration', i) as number;
					const startTime = this.getNodeParameter('start_time', i) as string;
					let start_time;

					if (type === 1){
						start_time = moment(startTime).unix();
					} else {
						start_time = moment(startTime).format('HH:mm');
					}

					body = {
						friendly_name,
						value,
						type,
						duration,
						start_time,
					};

					try {
						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/newMWindow', body);
						console.log({responseData});
						if (responseData.stat !== 'ok') {
							throw new Error(responseData.error.message);
						}
						responseData = responseData.mwindow;
					} catch (error) {
						throw new NodeApiError(this.getNode(), error);
					}
				}
				if (operation === 'delete') {
					const id = this.getNodeParameter('id', i) as string;

					body = {
						id,
					};

					try {
						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/deleteMWindow', body);
						console.log({responseData});
						if (responseData.stat !== 'ok') {
							throw new Error(responseData.error.message);
						}
						responseData = { status : responseData.message };
					} catch (error) {
						throw new NodeApiError(this.getNode(), error);
					}
				}
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const filters = this.getNodeParameter('filters', i) as IDataObject;

					body = {
						...filters,
					};

					if (!returnAll){
						body.limit = this.getNodeParameter('limit', i) as number;
					}

					try {
						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/getMWindows', body);
						console.log({responseData});
						if (responseData.stat !== 'ok') {
							throw new Error(responseData.error.message);
						}
						responseData = responseData.mwindows;
					} catch (error) {
						throw new NodeApiError(this.getNode(), error);
					}
				}
				if (operation === 'update') {
					const id = this.getNodeParameter('id', i) as string;
					const duration = this.getNodeParameter('duration', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					body = {
						id,
						duration,
						...updateFields,
					};

					try {
						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/editMWindow', body);
						console.log({responseData});
						if (responseData.stat !== 'ok') {
							throw new Error(responseData.error.message);
						}
						responseData = responseData.mwindow;
					} catch (error) {
						throw new NodeApiError(this.getNode(), error);
					}
				}
			}
			if (resource === 'psp'){
				if (operation === 'create') {
					const friendly_name = this.getNodeParameter('friendly_name', i) as string;
					const monitors = this.getNodeParameter('monitors', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					body = {
						friendly_name,
						monitors,
						...additionalFields,
					};

					try {
						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/newPSP', body);
						console.log({responseData});
						if (responseData.stat !== 'ok') {
							throw new Error(responseData.error.message);
						}
						responseData = responseData.psp;
					} catch (error) {
						throw new NodeApiError(this.getNode(), error);
					}
				}
				if (operation === 'delete') {
					const id = this.getNodeParameter('id', i) as string;

					body = {
						id,
					};

					try {
						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/deletePSP', body);
						console.log({responseData});
						if (responseData.stat !== 'ok') {
							throw new Error(responseData.error.message);
						}
						responseData = responseData.psp;
					} catch (error) {
						throw new NodeApiError(this.getNode(), error);
					}
				}
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const filters = this.getNodeParameter('filters', i) as IDataObject;

					body = {
						...filters,
					};

					if (!returnAll){
						body.limit = this.getNodeParameter('limit', i) as number;
					}

					try {
						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/getPSPs', body);
						console.log({responseData});
						if (responseData.stat !== 'ok') {
							throw new Error(responseData.error.message);
						}
						responseData = responseData.psps;
					} catch (error) {
						throw new NodeApiError(this.getNode(), error);
					}
				}
				if (operation === 'update') {
					const id = this.getNodeParameter('id', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					body = {
						id,
						...updateFields,
					};

					try {
						responseData = await uptimeRobotApiRequest.call(this, 'POST', '/editPSP', body);
						console.log({responseData});
						if (responseData.stat !== 'ok') {
							throw new Error(responseData.error.message);
						}
						responseData = responseData.psp;
					} catch (error) {
						throw new NodeApiError(this.getNode(), error);
					}
				}
			}

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
