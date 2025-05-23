import type { type IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
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
	const customResourceId = this.getNodeParameter('customResourceId', index) as string;
	const fields = this.getNodeParameter('fieldsToCreateOrUpdate', index) as IDataObject;
	await odooHTTPRequest.call(this, credentials, customResource, 'write', [+customResourceId], {
		vals: processNameValueFields(fields),
	});
	return { id: customResourceId };
}
