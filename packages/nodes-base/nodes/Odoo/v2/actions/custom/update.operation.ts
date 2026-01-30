import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { customResourceId, fieldsToCreateOrUpdate } from '../../descriptions';
import type { OdooCredentialsInterface } from '../../GenericFunctions';
import { odooHTTPRequest, processNameValueFields } from '../../GenericFunctions';

export const properties: INodeProperties[] = [...customResourceId, ...fieldsToCreateOrUpdate];

const displayOptions = {
	show: {
		resource: ['custom'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	index: number,
	credentials: OdooCredentialsInterface,
	customResource: string,
) {
	const customResourceId: string = this.getNodeParameter('customResourceId', index);
	const fields: IDataObject = this.getNodeParameter('fieldsToCreateOrUpdate', index);
	await odooHTTPRequest.call(this, credentials, customResource, 'write', [+customResourceId], {
		vals: processNameValueFields(fields),
	});
	return { id: customResourceId };
}
