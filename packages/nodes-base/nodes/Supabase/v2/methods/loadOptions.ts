import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { getProjectCredentials, managementApiRequest } from '../helpers';

export async function getTables(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const authentication = this.getNodeParameter('authentication', 'oAuth2') as string;
	const additionalOptions = this.getNodeParameter('additionalOptions', {}) as IDataObject;
	const schema = (additionalOptions.schema as string) || 'public';

	const { projectRef, credentialType } = await getProjectCredentials(this, authentication);

	const rows = await managementApiRequest.call(
		this,
		projectRef,
		credentialType,
		"SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type IN ('BASE TABLE', 'VIEW') ORDER BY table_name",
		[schema],
	);

	return rows.map((row) => ({
		name: row.table_name as string,
		value: row.table_name as string,
	}));
}

export async function getTableColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const authentication = this.getNodeParameter('authentication', 'oAuth2') as string;
	const additionalOptions = this.getNodeParameter('additionalOptions', {}) as IDataObject;
	const schema = (additionalOptions.schema as string) || 'public';
	const tableName = this.getCurrentNodeParameter('tableId') as string;

	const { projectRef, credentialType } = await getProjectCredentials(this, authentication);

	const rows = await managementApiRequest.call(
		this,
		projectRef,
		credentialType,
		'SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position',
		[schema, tableName],
	);

	return rows.map((row) => ({
		name: `${row.column_name as string} - (${row.data_type as string})`,
		value: row.column_name as string,
	}));
}
