import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { invoiceNinjaApiRequest, invoiceNinjaApiRequestAllItems } from '../GenericFunctions';
import type { IProject } from './ProjectInterface';

export const execute = async function (this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const length = items.length;
	const qs: IDataObject = {};

	let responseData;

	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);
	if (resource !== 'project') throw new Error('Invalid Resource Execution Handler');

	for (let i = 0; i < length; i++) {
		//Routes: https://github.com/invoiceninja/invoiceninja/blob/v5-stable/routes/api.php or swagger documentation
		try {
			if (operation === 'create') {
				const name = this.getNodeParameter('name', i);
				const clientId = this.getNodeParameter('clientId', i);
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: IProject = {};
				body.name = name as string;
				body.client_id = clientId as string;
				if (additionalFields.number !== undefined) {
					body.number = additionalFields.number as string;
				}
				if (additionalFields.assignedUserId !== undefined) {
					body.assigned_user_id = additionalFields.assignedUserId as string;
				}
				if (additionalFields.taskRate !== undefined) {
					body.task_rate = additionalFields.taskRate as number;
				}
				if (additionalFields.budgetedHours !== undefined) {
					body.budgeted_hours = additionalFields.budgetedHours as number;
				}
				if (additionalFields.dueDate !== undefined) {
					body.due_date = additionalFields.dueDate as string;
				}
				if (additionalFields.privateNotes !== undefined) {
					body.private_notes = additionalFields.privateNotes as string;
				}
				if (additionalFields.publicNotes !== undefined) {
					body.public_notes = additionalFields.publicNotes as string;
				}
				if (additionalFields.customValue1 !== undefined) {
					body.custom_value1 = additionalFields.customValue1 as string;
				}
				if (additionalFields.customValue2 !== undefined) {
					body.custom_value2 = additionalFields.customValue2 as string;
				}
				if (additionalFields.customValue3 !== undefined) {
					body.custom_value3 = additionalFields.customValue3 as string;
				}
				if (additionalFields.customValue4 !== undefined) {
					body.custom_value4 = additionalFields.customValue4 as string;
				}
				if (additionalFields.color !== undefined) {
					body.color = additionalFields.color as string;
				}
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'POST',
					'/projects',
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'update') {
				const projectId = this.getNodeParameter('projectId', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i);
				const body: IProject = {};
				if (additionalFields.name !== undefined) {
					body.name = additionalFields.name as string;
				}
				if (additionalFields.clientId !== undefined) {
					body.client_id = additionalFields.clientId as string;
				}
				if (additionalFields.number !== undefined) {
					body.number = additionalFields.number as string;
				}
				if (additionalFields.assignedUserId !== undefined) {
					body.assigned_user_id = additionalFields.assignedUserId as string;
				}
				if (additionalFields.taskRate !== undefined) {
					body.task_rate = additionalFields.taskRate as number;
				}
				if (additionalFields.budgetedHours !== undefined) {
					body.budgeted_hours = additionalFields.budgetedHours as number;
				}
				if (additionalFields.dueDate !== undefined) {
					body.due_date = additionalFields.dueDate as string;
				}
				if (additionalFields.privateNotes !== undefined) {
					body.private_notes = additionalFields.privateNotes as string;
				}
				if (additionalFields.publicNotes !== undefined) {
					body.public_notes = additionalFields.publicNotes as string;
				}
				if (additionalFields.customValue1 !== undefined) {
					body.custom_value1 = additionalFields.customValue1 as string;
				}
				if (additionalFields.customValue2 !== undefined) {
					body.custom_value2 = additionalFields.customValue2 as string;
				}
				if (additionalFields.customValue3 !== undefined) {
					body.custom_value3 = additionalFields.customValue3 as string;
				}
				if (additionalFields.customValue4 !== undefined) {
					body.custom_value4 = additionalFields.customValue4 as string;
				}
				if (additionalFields.color !== undefined) {
					body.color = additionalFields.color as string;
				}
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'PUT',
					`/projects/${projectId}`,
					body as IDataObject,
				);
				responseData = responseData.data;
			}
			if (operation === 'get') {
				const projectId = this.getNodeParameter('projectId', i) as string;
				// no include found in result
				// const include = this.getNodeParameter('include', i) as Array<string>;
				// if (include.length) {
				//     qs.include = include.toString() as string;
				// }
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'GET',
					`/projects/${projectId}`,
					{},
					qs,
				);
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
				// no include found in result
				// const include = this.getNodeParameter('include', i) as Array<string>;
				// if (include.length) {
				//     qs.include = include.toString() as string;
				// }
				const returnAll = this.getNodeParameter('returnAll', i);
				if (returnAll) {
					responseData = await invoiceNinjaApiRequestAllItems.call(
						this,
						'data',
						'GET',
						'/projects',
						{},
						qs,
					);
				} else {
					const perPage = this.getNodeParameter('perPage', i) as number;
					if (perPage) qs.per_page = perPage;
					responseData = await invoiceNinjaApiRequest.call(this, 'GET', '/projects', {}, qs);
					responseData = responseData.data;
				}
			}
			if (operation === 'delete') {
				const projectId = this.getNodeParameter('projectId', i) as string;
				responseData = await invoiceNinjaApiRequest.call(this, 'DELETE', `/projects/${projectId}`);
				responseData = responseData.data;
			}
			if (operation === 'action') {
				const projectId = this.getNodeParameter('projectId', i) as string;
				const action = this.getNodeParameter('action', i) as string;
				responseData = await invoiceNinjaApiRequest.call(
					this,
					'POST',
					`/projects/bulk`,
					{
						action,
						ids: [projectId]
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
