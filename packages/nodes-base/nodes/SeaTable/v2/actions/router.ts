import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';

import * as row from './row';
import * as base from './base';
import * as link from './link';
import * as asset from './asset';

import type { SeaTable } from './Interfaces';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const operationResult: INodeExecutionData[] = [];
	let responseData: IDataObject | IDataObject[] = [];

	for (let i = 0; i < items.length; i++) {
		const resource = this.getNodeParameter<SeaTable>('resource', i);
		const operation = this.getNodeParameter('operation', i);

		const seatable = {
			resource,
			operation,
		} as SeaTable;

		try {
			if (seatable.resource === 'row') {
				responseData = await row[seatable.operation].execute.call(this, i);
			} else if (seatable.resource === 'base') {
				responseData = await base[seatable.operation].execute.call(this, i);
			} else if (seatable.resource === 'link') {
				responseData = await link[seatable.operation].execute.call(this, i);
			} else if (seatable.resource === 'asset') {
				responseData = await asset[seatable.operation].execute.call(this, i);
			}

			const executionData = this.helpers.constructExecutionMetaData(
				responseData as INodeExecutionData[],
				{
					itemData: { item: i },
				},
			);

			operationResult.push(...executionData);
		} catch (err) {
			if (this.continueOnFail()) {
				operationResult.push({ json: this.getInputData(i)[0].json, error: err });
			} else {
				if (err.context) err.context.itemIndex = i;
				throw err;
			}
		}
	}

	return [operationResult];
}
