import type { IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import * as custom from './custom';
import type { OdooV2 } from './node.type';
import type { OdooCRUD } from '../GenericFunctions';
import { odooGetRequestCredentials } from '../GenericFunctions';

export async function router(this: IExecuteFunctions) {
	let items = this.getInputData();
	items = deepCopy(items);
	const returnData: INodeExecutionData[] = [];

	const resource = this.getNodeParameter<OdooV2>('resource', 0) as string;
	const operation = this.getNodeParameter('operation', 0) as OdooCRUD;

	const odooV2 = {
		resource,
		operation,
	} as OdooV2;

	const odooRequestCredentials = await odooGetRequestCredentials.call(this);

	for (let i = 0; i < items.length; i++) {
		try {
			let responseData;

			switch (odooV2.resource) {
				case 'custom': {
					const customResource = this.getNodeParameter('customResource', i) as string;

					responseData = await custom[odooV2.operation].execute.call(
						this,
						i,
						odooRequestCredentials,
						customResource,
					);
					break;
				}
				default:
					throw new ApplicationError();
			}

			if (responseData !== undefined) {
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			}
		} catch (error) {
			if (this.continueOnFail()) {
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: error.message }),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);

				continue;
			}
			throw error;
		}
	}

	return [returnData];
}
