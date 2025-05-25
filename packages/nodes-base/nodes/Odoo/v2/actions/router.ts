import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { deepCopy } from 'n8n-workflow';

import * as custom from './custom';
import type { OdooV2 } from './node.type';
import type { OdooCRUD } from '../GenericFunctions';
import { odooGetRequestCredentials } from '../GenericFunctions';

export async function router(this: IExecuteFunctions) {
	let items = this.getInputData();
	items = deepCopy(items);
	const returnData: INodeExecutionData[] = [];

	const resource: string = this.getNodeParameter<OdooV2>('resource', 0);
	const operation: OdooCRUD = this.getNodeParameter('operation', 0);

	const odooV2: OdooV2 = {
		resource,
		operation,
	};

	const odooRequestCredentials = await odooGetRequestCredentials.call(this);

	for (let i = 0; i < items.length; i++) {
		try {
			let responseData;

			switch (odooV2.resource) {
				case 'custom': {
					const customResource: string = this.getNodeParameter('customResource', i);

					responseData = await custom[odooV2.operation].execute.call(
						this,
						i,
						odooRequestCredentials,
						customResource,
					);
					break;
				}
				default:
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not known`,
						{ itemIndex: i },
					);
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
