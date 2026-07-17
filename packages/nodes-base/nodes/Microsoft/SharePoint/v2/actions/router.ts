import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';

import * as file from './file';
import * as list from './list';
import type { MicrosoftSharePointType } from './node.type';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	let responseData;

	const resource = this.getNodeParameter<MicrosoftSharePointType>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const sharePointTypeData = {
		resource,
		operation,
	} as MicrosoftSharePointType;

	// Operations run once per item, so the site ID cache is hoisted here to
	// span the whole run — each distinct site URL then costs one Graph lookup.
	const siteIdCache = new Map<string, string>();

	for (let i = 0; i < items.length; i++) {
		try {
			switch (sharePointTypeData.resource) {
				case 'file':
					if (!(sharePointTypeData.operation in file)) {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported!`,
						);
					}
					responseData = await file[sharePointTypeData.operation].execute.call(
						this,
						i,
						siteIdCache,
					);
					break;
				case 'list':
					if (!(sharePointTypeData.operation in list)) {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported!`,
						);
					}
					responseData = await list[sharePointTypeData.operation].execute.call(
						this,
						i,
						siteIdCache,
					);
					break;
				default:
					throw new NodeOperationError(
						this.getNode(),
						`The resource "${resource}" is not supported!`,
					);
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject),
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
	return [returnData];
}
