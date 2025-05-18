import type { type IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { customResourceId, fieldsToInclude } from '../../descriptions';
import type { OdooCredentialsInterface } from '../../GenericFunctions';
import { odooHTTPRequest } from '../../GenericFunctions';

export const properties: INodeProperties[] = [...customResourceId, ...fieldsToInclude];

const displayOptions = {
	show: {
		resource: ['custom'],
		operation: ['get'],
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
	const options = this.getNodeParameter('options', index);
	const fields = (options.fieldsList as IDataObject[]) || [];

	return await odooHTTPRequest.call(
		this,
		credentials,
		customResource,
		'read',
		[+customResourceId],
		{ fields },
	);
}
