import moment from 'moment-timezone';
import type {
	IDataObject,
	IHttpRequestMethods,
	INodeExecutionData,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { apiRequest, apiRequestAllItems, downloadRecordAttachments } from '../../GenericFunctions';

export async function poll_trigger(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
	const returnData: IDataObject[] = [];
	let responseData;

	let requestMethod: IHttpRequestMethods;
	let endPoint = '';
	let qs: IDataObject = {};

	const baseId = this.getNodeParameter('projectId', undefined, {
		extractValue: true,
	}) as string;

	try {
		const webhookData = this.getWorkflowStaticData('node');

		const now = moment().utc().toISOString();
		const startDate = (webhookData.lastTimeChecked as string) || now;
		const endDate = now;

		requestMethod = 'GET';
		const table = this.getNodeParameter('table', undefined, {
			extractValue: true,
		}) as string;
		const triggerFieldName = this.getNodeParameter('triggerFieldName', undefined, {
			extractValue: true,
		}) as string;

		qs = this.getNodeParameter('options', {}) as any;

		endPoint = `/api/v3/data/${baseId}/${table}/records`;

		if (qs.sort) {
			const properties = (qs.sort as IDataObject).property as Array<{
				field: string;
				direction: string;
			}>;
			qs.sort = properties
				.map((prop) => `${prop.direction === 'asc' ? '' : '-'}${prop.field}`)
				.join(',');
		}
		if (qs.fields) {
			qs.fields = (qs.fields as IDataObject[]).join(',');
		}
		if (this.getMode() !== 'manual') {
			const clause = `("${triggerFieldName}",gte,exactDate,"${startDate}")~and("${triggerFieldName}",lte,exactDate,"${endDate}")`;
			if (qs.where) {
				qs.where += `~and${clause}`;
			} else {
				qs.where = clause;
			}
		}
		if (this.getMode() === 'manual') {
			qs.limit = 1;
			responseData = (await apiRequest.call(this, requestMethod, endPoint, {}, qs)).records;
		} else {
			responseData = await apiRequestAllItems.call(this, requestMethod, endPoint, {}, qs);
		}

		const downloadAttachments = this.getNodeParameter('downloadAttachments', undefined) as boolean;

		if (downloadAttachments) {
			const downloadFieldNames = (
				this.getNodeParameter('downloadFieldNames', undefined) as string
			).split(',');
			const response = await downloadRecordAttachments.call(
				this,
				responseData as IDataObject[],
				downloadFieldNames,
				[{ item: 0 }],
			);
			returnData.push(...response);
		} else {
			returnData.push(...(responseData as IDataObject[]));
		}
		webhookData.lastTimeChecked = endDate;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}

	return [this.helpers.returnJsonArray(returnData)];
}
