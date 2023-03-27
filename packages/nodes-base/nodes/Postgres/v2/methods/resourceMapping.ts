import type {
	ILoadOptionsFunctions,
	ResourceMapperFields,
	ResourceMapperFieldType,
} from 'n8n-workflow';
import { getTableSchema } from '../helpers/utils';
import { configurePostgres } from '../transport';

const fieldTypeMapping: Record<ResourceMapperFieldType, string[]> = {
	string: ['text', 'varchar', 'character varying', 'character', 'char'],
	number: [
		'integer',
		'smallint',
		'bigint',
		'decimal',
		'numeric',
		'real',
		'double precision',
		'smallserial',
		'serial',
		'bigserial',
	],
	boolean: ['boolean'],
	datetime: ['timestamp', 'date', 'time'],
};

function mapPostgresType(postgresType: string): ResourceMapperFieldType {
	let mappedType: ResourceMapperFieldType = 'string';

	for (const t of Object.keys(fieldTypeMapping)) {
		const postgresTypes = fieldTypeMapping[t as ResourceMapperFieldType];
		if (postgresTypes.includes(postgresType)) {
			mappedType = t as ResourceMapperFieldType;
		}
	}

	return mappedType;
}

export async function getMappingColumns(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const credentials = await this.getCredentials('postgres');
	const fieldsToMatch = (this.getNodeParameter('columns.match', 0) as string[]) || [];

	const { db, pgp, sshClient } = await configurePostgres(credentials);

	const schema = this.getNodeParameter('schema', 0, {
		extractValue: true,
	}) as string;

	const table = this.getNodeParameter('table', 0, {
		extractValue: true,
	}) as string;

	try {
		const columns = await getTableSchema(db, schema, table);

		const columnData: ResourceMapperFields = {
			fields: columns.map((col) => ({
				id: col.column_name,
				displayName: col.column_name,
				match: fieldsToMatch.includes(col.column_name),
				required: col.is_nullable !== 'YES',
				defaultMatch: col.column_name === 'id',
				display: true,
				type: mapPostgresType(col.data_type),
			})),
		};
		return columnData;
	} catch (error) {
		throw error;
	} finally {
		if (sshClient) {
			sshClient.end();
		}
		pgp.end();
	}
}
