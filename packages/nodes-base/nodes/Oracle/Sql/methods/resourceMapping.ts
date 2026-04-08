import type { ILoadOptionsFunctions, ResourceMapperFields, FieldType } from 'n8n-workflow';

import type { OracleDBNodeCredentials } from '../helpers/interfaces';
import { getColumnMetaData, mapDbType } from '../helpers/utils';
import { configureOracleDB } from '../transport';

export async function getMappingColumns(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const credentials = await this.getCredentials<OracleDBNodeCredentials>('oracleDBApi');

	const pool = await configureOracleDB.call(this, credentials);

	const schema = this.getNodeParameter('schema', 0, {
		extractValue: true,
	}) as string;

	const table = this.getNodeParameter('table', 0, {
		extractValue: true,
	}) as string;

	const columns = await getColumnMetaData(this.getNode(), pool, schema, table);
	const fields = columns.map((col) => {
		const type = mapDbType(col.dataType).n8nType as FieldType;
		const nullable = col.isNullable;
		const hasDefault = col.columnDefault === 'YES';
		const isGenerated = col.isGenerated === 'ALWAYS';

		return {
			id: col.columnName,
			displayName: col.columnName,
			required: !nullable && !hasDefault && !isGenerated,
			display: true,
			type,
			defaultMatch: true,
		};
	});
	return { fields };
}
