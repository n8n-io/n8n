import type { type IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { fieldsToCreateOrUpdate } from '../../descriptions';
import type { OdooCredentialsInterface } from '../../GenericFunctions';
import { odooHTTPRequest, processNameValueFields } from '../../GenericFunctions';

export const properties: INodeProperties[] = [...fieldsToCreateOrUpdate];

const displayOptions = {
	show: {
		resource: ['custom'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	index: number,
	credentials: OdooCredentialsInterface,
	customResource: string,
) {
	const fields = processNameValueFields(
		this.getNodeParameter('fieldsToCreateOrUpdate', index) as IDataObject,
	);

	const response = await odooHTTPRequest.call(this, credentials, customResource, 'create', [
		fields,
	]);
	return { id: response };
}
