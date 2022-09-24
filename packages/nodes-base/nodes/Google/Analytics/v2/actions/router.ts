import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, NodeOperationError } from 'n8n-workflow';

import { GoogleAnalytics, ReportBasedOnProperty } from './node.type';
import * as userActivity from './userActivity/UserActivity.resource';
import * as report from './report/Report.resource';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: IDataObject[] = [];
	const resource = this.getNodeParameter<GoogleAnalytics>('resource', 0) as string;
	const operation = this.getNodeParameter('operation', 0) as string;

	let responseData;

	const googleAnalytics = {
		resource,
		operation,
	} as GoogleAnalytics;

	for (let i = 0; i < items.length; i++) {
		try {
			switch (googleAnalytics.resource) {
				case 'report':
					const propertyType = this.getNodeParameter('propertyType', 0) as string;
					const operationBasedOnProperty = `${operation}${propertyType}` as ReportBasedOnProperty;
					responseData = await report[operationBasedOnProperty].execute.call(this, i);
					break;
				case 'userActivity':
					responseData = await userActivity[googleAnalytics.operation].execute.call(this, i);
					break;
				default:
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
			}

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else if (responseData !== undefined) {
				returnData.push(responseData as IDataObject);
			}
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
