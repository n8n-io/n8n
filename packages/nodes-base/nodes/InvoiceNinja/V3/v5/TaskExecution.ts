import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { invoiceNinjaApiRequest, invoiceNinjaApiRequestAllItems } from '../GenericFunctions';
import type { ITask } from './TaskInterface';

export const execute = async function (this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const length = items.length;
	const qs: IDataObject = {};

	let responseData;

	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);
	if (resource !== 'task') throw new Error('Invalid Resource Execution Handler');

	for (let i = 0; i < length; i++) {
		//Routes: https://github.com/invoiceninja/invoiceninja/blob/v5-stable/routes/api.php or swagger documentation
		try {
			if (operation === 'create') {
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: ITask = {};
				if (additionalFields.client) {
					body.client_id = additionalFields.client as string;
				}
				if (additionalFields.project) {
					body.project_id = additionalFields.project as string;
				}
				if (additionalFields.description) {
					body.description = additionalFields.description as string;
				}
				if (additionalFields.customValue1) {
					body.custom_value1 = additionalFields.customValue1 as string;
				}
				if (additionalFields.customValue2) {
					body.custom_value2 = additionalFields.customValue2 as string;
				}
				if (additionalFields.customValue3) {
					body.custom_value3 = additionalFields.customValue3 as string;
				}
				if (additionalFields.customValue4) {
					body.custom_value4 = additionalFields.customValue4 as string;
				}
				const timeLogsValues = (this.getNodeParameter('timeLogsUi', i) as IDataObject)
					.timeLogsValues as IDataObject[];
				if (timeLogsValues) {
					const logs: number[][] = [];
					for (const logValue of timeLogsValues) {
						let from = 0,
							to;
						if (logValue.startDate) {
							from = new Date(logValue.startDate as string).getTime() / 1000;
						}
						if (logValue.endDate) {
							to = new Date(logValue.endDate as string).getTime() / 1000;
						}
						if (logValue.duration) {
							to = from + (logValue.duration as number) * 3600;
						}
						logs.push([from, to as number]);
					}
					body.time_log = JSON.stringify(logs);
				}
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'POST',
					'/tasks',
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'update') {
				const taskId = this.getNodeParameter('taskId', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: ITask = {};
				if (additionalFields.client) {
					body.client_id = additionalFields.client as string;
				}
				if (additionalFields.project) {
					body.project_id = additionalFields.project as string;
				}
				if (additionalFields.description) {
					body.description = additionalFields.description as string;
				}
				if (additionalFields.customValue1) {
					body.custom_value1 = additionalFields.customValue1 as string;
				}
				if (additionalFields.customValue2) {
					body.custom_value2 = additionalFields.customValue2 as string;
				}
				if (additionalFields.customValue3) {
					body.custom_value3 = additionalFields.customValue3 as string;
				}
				if (additionalFields.customValue4) {
					body.custom_value4 = additionalFields.customValue4 as string;
				}
				const timeLogsValues = (this.getNodeParameter('timeLogsUi', i) as IDataObject)
					.timeLogsValues as IDataObject[];
				if (timeLogsValues) {
					const logs: number[][] = [];
					for (const logValue of timeLogsValues) {
						let from = 0,
							to;
						if (logValue.startDate) {
							from = new Date(logValue.startDate as string).getTime() / 1000;
						}
						if (logValue.endDate) {
							to = new Date(logValue.endDate as string).getTime() / 1000;
						}
						if (logValue.duration) {
							to = from + (logValue.duration as number) * 3600;
						}
						logs.push([from, to as number]);
					}
					body.time_log = JSON.stringify(logs);
				}
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'PUT',
					`/tasks/${taskId}`,
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'get') {
				const taskId = this.getNodeParameter('taskId', i) as string;
				const include = this.getNodeParameter('include', i) as string[];
				if (include.length) {
					qs.include = include.toString();
				}
				responseData = await invoiceNinjaApiRequest.call(this, 'GET', `/tasks/${taskId}`, {}, qs);
				responseData = responseData.data;
			}
			if (operation === 'getAll') {
				const filters = this.getNodeParameter('filters', i);
				if (filters.filter) {
					qs.filter = filters.filter as string;
				}
				if (filters.number) {
					qs.number = filters.number as string;
				}
				const include = this.getNodeParameter('include', i) as string[];
				if (include.length) {
					qs.include = include.toString();
				}
				const returnAll = this.getNodeParameter('returnAll', i);
				if (returnAll) {
					responseData = await invoiceNinjaApiRequestAllItems.call(
						this,
						'data',
						'GET',
						'/tasks',
						{},
						qs,
					);
				} else {
					const perPage = this.getNodeParameter('perPage', i) as boolean;
					if (perPage) qs.per_page = perPage;
					responseData = await invoiceNinjaApiRequest.call(this, 'GET', '/tasks', {}, qs);
					responseData = responseData.data;
				}
			}
			if (operation === 'delete') {
				const taskId = this.getNodeParameter('taskId', i) as string;
				responseData = await invoiceNinjaApiRequest.call(this, 'DELETE', `/tasks/${taskId}`);
				responseData = responseData.data;
			}
			if (operation === 'action') {
				const taskId = this.getNodeParameter('taskId', i) as string;
				const action = this.getNodeParameter('action', i) as string;
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'POST',
					`/tasks/bulk`,
					{
						action,
						ids: [taskId]
					}
				);
				responseData = responseData.data[0];
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				const executionErrorData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: error.message }),
					{ itemData: { item: i } },
				);
				returnData.push(...executionErrorData);
				continue;
			}
			throw error;
		}
	}

	return this.prepareOutputData(returnData);
};
