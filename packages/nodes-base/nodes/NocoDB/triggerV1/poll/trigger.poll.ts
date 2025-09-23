import moment from 'moment-timezone';
import type {
	IDataObject,
	IHttpRequestMethods,
	INodeExecutionData,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { apiRequest, apiRequestAllItems, downloadRecordAttachments } from '../../v2/transport';

export async function pollTrigger(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
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
				field: {
					value: string;
				};
				direction: string;
			}>;
			qs.sort = JSON.stringify(
				properties.map((prop) => {
					return {
						field: prop.field.value,
						direction: prop.direction,
					};
				}),
			);
		}
		if (qs.fields) {
			qs.fields = ((qs.fields as IDataObject).items as IDataObject[])
				.map((field: IDataObject) => (field.field as IDataObject).value)
				.join(',');
		}
		if (this.getMode() !== 'manual') {
			const clause = `("${triggerFieldName}",gte,exactDate,"${startDate}")~and("${triggerFieldName}",lt,exactDate,"${endDate}")`;
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
		if (responseData?.length) {
			const downloadAttachments = this.getNodeParameter(
				'downloadAttachments',
				undefined,
			) as boolean;

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
				returnData.push.apply(returnData, response);
			} else {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			}
			webhookData.lastTimeChecked = endDate;
			return [this.helpers.returnJsonArray(returnData)];
		} else {
			return null;
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
