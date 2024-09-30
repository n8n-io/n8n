import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';

import * as file from './files';
import * as search from './search';
import * as info from './info';
import * as folders from './folders';
import * as share from './shares';
import * as tags from './tags';
import * as libraries from './libraries';

import { Seafile } from './Interfaces';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const operationResult: INodeExecutionData[] = [];
	let responseData: IDataObject | IDataObject[] = [];

	for (let i = 0; i < items.length; i++) {
		const resource = this.getNodeParameter<Seafile>('resource', i);
		const operation = this.getNodeParameter('operation', i);

		//console.log(operation);
		//console.log(resource);

		const seafile = {
			resource,
			operation,
		} as Seafile;

		try {
			if (seafile.resource === 'files') {
				responseData = await file[seafile.operation].execute.call(this, i);
			} else if (seafile.resource === 'search') {
				responseData = await search[seafile.operation].execute.call(this, i);
			} else if (seafile.resource === 'info') {
				responseData = await info[seafile.operation].execute.call(this, i);
			} else if (seafile.resource === 'folders') {
				responseData = await folders[seafile.operation].execute.call(this, i);
			} else if (seafile.resource === 'share') {
				responseData = await share[seafile.operation].execute.call(this, i);
			} else if (seafile.resource === 'tags') {
				responseData = await tags[seafile.operation].execute.call(this, i);
			} else if (seafile.resource === 'libraries') {
				responseData = await libraries[seafile.operation].execute.call(this, i);
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData),
				{ itemData: { item: i } },
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
