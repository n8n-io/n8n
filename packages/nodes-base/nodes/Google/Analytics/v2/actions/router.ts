import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { GoogleAnalytics, ReportBasedOnProperty } from './node.type';
import * as report from './report/Report.resource';
import * as userActivity from './userActivity/UserActivity.resource';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const resource = this.getNodeParameter<GoogleAnalytics>('resource', 0) as string;
	const operation = this.getNodeParameter('operation', 0);

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
					const operationBasedOnProperty =
						`${googleAnalytics.operation}${propertyType}` as ReportBasedOnProperty;
					responseData = await report[operationBasedOnProperty].execute.call(this, i);
					break;
				case 'userActivity':
					responseData = await userActivity[googleAnalytics.operation].execute.call(this, i);
					break;
				default:
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known`);
			}

			returnData.push(...responseData);
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
	return [returnData];
}
