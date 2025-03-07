import type { ILoadOptionsFunctions, ResourceMapperFields, FieldType } from 'n8n-workflow';

import { configurePostgres } from '../../transport';
import type { PostgresNodeCredentials } from '../helpers/interfaces';
import { getEnumValues, getEnums, getTableSchema, uniqueColumns } from '../helpers/utils';

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
	const credentials = await this.getCredentials<PostgresNodeCredentials>('postgres');

	const { db } = await configurePostgres.call(this, credentials);

	const schema = this.getNodeParameter('schema', 0, {
		extractValue: true,
	}) as string;

	const table = this.getNodeParameter('table', 0, {
		extractValue: true,
	}) as string;

	const operation = this.getNodeParameter('operation', 0, {
		extractValue: true,
	}) as string;

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
			const isGenerated =
				col.is_generated === 'ALWAYS' ||
				['ALWAYS', 'BY DEFAULT'].includes(col.identity_generation ?? '');
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
}
