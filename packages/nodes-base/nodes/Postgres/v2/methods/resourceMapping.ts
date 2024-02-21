import type { ILoadOptionsFunctions, ResourceMapperFields, FieldType } from 'n8n-workflow';
import { getEnumValues, getEnums, getTableSchema, uniqueColumns } from '../helpers/utils';
import { configurePostgres } from '../transport';

const fieldTypeMapping: Partial<Record<FieldType, string[]>> = {
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
	dateTime: [
		'timestamp',
		'date',
		'timestampz',
		'timestamp without time zone',
		'timestamp with time zone',
	],
	time: ['time', 'time without time zone', 'time with time zone'],
	object: ['json', 'jsonb'],
	options: ['enum', 'USER-DEFINED'],
	array: ['ARRAY'],
};

function mapPostgresType(postgresType: string): FieldType {
	let mappedType: FieldType = 'string';

	for (const t of Object.keys(fieldTypeMapping)) {
		const postgresTypes = fieldTypeMapping[t as FieldType];
		if (postgresTypes?.includes(postgresType)) {
			mappedType = t as FieldType;
		}
	}
	return mappedType;
}

export async function getMappingColumns(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const credentials = await this.getCredentials('postgres');

	const { db, sshClient } = await configurePostgres(credentials);

	const schema = this.getNodeParameter('schema', 0, {
		extractValue: true,
	}) as string;

	const table = this.getNodeParameter('table', 0, {
		extractValue: true,
	}) as string;

	const operation = this.getNodeParameter('operation', 0, {
		extractValue: true,
	}) as string;

	try {
		const columns = await getTableSchema(db, schema, table, { getColumnsForResourceMapper: true });
		const unique = operation === 'upsert' ? await uniqueColumns(db, table, schema) : [];
		const enumInfo = await getEnums(db);
		const fields = await Promise.all(
			columns.map(async (col) => {
				const canBeUsedToMatch =
					operation === 'upsert' ? unique.some((u) => u.attname === col.column_name) : true;
				const type = mapPostgresType(col.data_type);
				const options =
					type === 'options' ? getEnumValues(enumInfo, col.udt_name as string) : undefined;
				const hasDefault = Boolean(col.column_default);
				const isGenerated = col.is_generated === 'ALWAYS' || col.identity_generation === 'ALWAYS';
				const nullable = col.is_nullable === 'YES';
				return {
					id: col.column_name,
					displayName: col.column_name,
					required: !nullable && !hasDefault && !isGenerated,
					defaultMatch: (col.column_name === 'id' && canBeUsedToMatch) || false,
					display: true,
					type,
					canBeUsedToMatch,
					options,
				};
			}),
		);
		return { fields };
	} catch (error) {
		throw error;
	} finally {
		if (sshClient) {
			sshClient.end();
		}
		if (!db.$pool.ending) await db.$pool.end();
	}
}
