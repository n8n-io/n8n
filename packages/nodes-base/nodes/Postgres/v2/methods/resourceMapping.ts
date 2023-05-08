import type { ILoadOptionsFunctions, ResourceMapperFields, FieldType } from 'n8n-workflow';
import { getTableSchema, isColumnUnique } from '../helpers/utils';
import { Connections } from '../transport';
import type { ConnectionsData } from '../helpers/interfaces';

const fieldTypeMapping: Record<FieldType, string[]> = {
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
	array: [],
};

function mapPostgresType(postgresType: string): FieldType {
	let mappedType: FieldType = 'string';

	for (const t of Object.keys(fieldTypeMapping)) {
		const postgresTypes = fieldTypeMapping[t as FieldType];
		if (postgresTypes.includes(postgresType)) {
			mappedType = t as FieldType;
		}
	}

	return mappedType;
}

export async function getMappingColumns(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const credentials = await this.getCredentials('postgres');
	const fieldsToMatch = (this.getNodeParameter('columns.matchingColumns', 0) as string[]) || [];

	const { db } = (await Connections.getInstance(credentials)) as ConnectionsData;

	const schema = this.getNodeParameter('schema', 0, {
		extractValue: true,
	}) as string;

	const table = this.getNodeParameter('table', 0, {
		extractValue: true,
	}) as string;

	try {
		const columns = await getTableSchema(db, schema, table);
		const fields = await Promise.all(
			columns.map(async (col) => {
				const canBeUsedToMatch = await isColumnUnique(db, table, col.column_name);
				return {
					id: col.column_name,
					displayName: col.column_name,
					match: fieldsToMatch.includes(col.column_name),
					required: col.is_nullable !== 'YES',
					defaultMatch: col.column_name === 'id',
					display: true,
					type: mapPostgresType(col.data_type),
					canBeUsedToMatch,
				};
			}),
		);
		return { fields };
	} catch (error) {
		throw error;
	}
}
