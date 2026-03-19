import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { buildTableRef, getProjectCredentials } from '../helpers';
import * as create from './row/create.operation';
import * as del from './row/delete.operation';
import * as get from './row/get.operation';
import * as getMany from './row/getMany.operation';
import * as update from './row/update.operation';
import * as upsert from './row/upsert.operation';

const rowOperations: Record<
	string,
	{
		execute(
			this: IExecuteFunctions,
			tableRef: string,
			projectRef: string,
			credentialType: string,
		): Promise<INodeExecutionData[]>;
	}
> = {
	create,
	delete: del,
	get,
	getAll: getMany,
	update,
	upsert,
};

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const resource = this.getNodeParameter('resource', 0) as string;
	const operation = this.getNodeParameter('operation', 0) as string;
	const authentication = this.getNodeParameter('authentication', 0, 'oAuth2') as string;
	const additionalOptions = this.getNodeParameter('additionalOptions', 0, {}) as IDataObject;
	const schema = (additionalOptions.schema as string) || 'public';

	const { projectRef, credentialType } = await getProjectCredentials(this, authentication);

	if (resource === 'row') {
		const tableId = this.getNodeParameter('tableId', 0) as string;
		const tableRef = buildTableRef(schema, tableId, this.getNode());

		const handler = rowOperations[operation];
		const returnData = await handler.execute.call(this, tableRef, projectRef, credentialType);
		return [returnData];
	}

	return [[]];
}
