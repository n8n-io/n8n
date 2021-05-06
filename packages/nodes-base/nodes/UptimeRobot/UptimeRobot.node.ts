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
} from './MonitorDescripion'

export class UptimeRobot implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'UptimeRobot',
		name: 'uptimeRobot',
		icon: 'file:uptimeRobot.svg',
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
						name: 'Monitor',
						value: 'monitor',
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
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
