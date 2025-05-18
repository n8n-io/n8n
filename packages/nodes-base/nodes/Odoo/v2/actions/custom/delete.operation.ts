import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { customResourceId } from '../../descriptions';
import type { OdooCredentialsInterface } from '../../GenericFunctions';
import { odooHTTPRequest } from '../../GenericFunctions';

export const properties: INodeProperties[] = [...customResourceId];

const displayOptions = {
	show: {
		resource: ['custom'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	index: number,
	credentials: OdooCredentialsInterface,
	customResource: string,
) {
	const customResourceIdParam = this.getNodeParameter('customResourceId', index) as string;
	const response = await odooHTTPRequest.call(this, credentials, customResource, 'unlink', [
		+customResourceIdParam,
	]);
	return { success: response };
}
