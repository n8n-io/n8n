import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type * as oracleDBTypes from 'oracledb';

import { updateDisplayOptions } from '@utils/utilities';

import type {
	ColumnInfo,
	ColumnMap,
	QueryMode,
	OracleDBNodeOptions,
	QueriesRunner,
	QueryWithValues,
} from '../../helpers/interfaces';
import {
	configureTableSchemaUpdater,
	getColumnMap,
	getCompatibleValue,
	getInBindParametersForSourceSelect,
	getOnClauseFromColumns,
	getInsertClauseAndBinds,
	getUpdateSetClause,
	getColumnMetaData,
	getOutBindDefsForExecute,
	quoteSqlIdentifier,
} from '../../helpers/utils';
import { optionsCollection } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'resourceMapper',
		noDataExpression: true,
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		required: true,
		typeOptions: {
			loadOptionsDependsOn: ['table.value', 'operation'],
			resourceMapper: {
				resourceMapperMethod: 'getMappingColumns',
				mode: 'upsert',
				fieldWords: {
					singular: 'column',
					plural: 'columns',
				},
				addAllFields: true,
				multiKeyMatch: true,
			},
		},
	},
	...optionsCollection,
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['upsert'],
	},
	hide: {
		table: [''],
	},
};

function getQuery(
	ctx: IExecuteFunctions,
	items: INodeExecutionData[],
	schema: string,
	table: string,
	tableSchema: ColumnInfo[],
	bindParams: oracleDBTypes.BindParameter[],
	bindDefs: oracleDBTypes.BindDefinition[] | null,
	index: number,
	executeManyValues: any[] | null = null,
) {
	const dataMode = ctx.getNodeParameter('columns.mappingMode', index) as string;
	let item: IDataObject = {};

	if (dataMode === 'autoMapInputData') {
		item = items[index].json;
	} else if (dataMode === 'defineBelow') {
		item = ctx.getNodeParameter('columns.value', index) as IDataObject;
	}
	const columnMetaDataObject: ColumnMap = getColumnMap(tableSchema);
	const columnsToMatchOn: string[] = ctx.getNodeParameter(
		'columns.matchingColumns',
		index,
	) as string[];

	if (columnsToMatchOn.length === 0) {
		throw new NodeOperationError(
			ctx.getNode(),
			'No matching columns configured. Please define at least one column to match on.',
		);
	}

	if (item[columnsToMatchOn[0]] === undefined) {
		throw new NodeOperationError(
			ctx.getNode(),
			"Column to match on not found in input item. Add a column to match on or set the 'Data Mode' to 'Define Below' to define the value to match on.",
		);
	}
	if (Object.keys(item).length === 1) {
		// Only match column exists, nothing to update/insert
		throw new NodeOperationError(
			ctx.getNode(),
			"Add values to update or insert to the input item or set the 'Data Mode' to 'Define Below' to define the values to insert or update.",
		);
	}
	const updateColumns = Object.keys(item).filter((column) => !columnsToMatchOn.includes(column));

	const inputColumns = Object.keys(item);

	const [sourceSelect, posIndex1] = getInBindParametersForSourceSelect(
		columnsToMatchOn,
		columnMetaDataObject,
		item,
		bindParams,
		bindDefs,
		0,
	);
	const onClause = getOnClauseFromColumns(columnsToMatchOn);
	const [updateSetClause, posIndex2] = getUpdateSetClause(
		updateColumns,
		columnMetaDataObject,
		item,
		bindParams,
		bindDefs,
		posIndex1,
	);
	const [insertColsStr, insertValsStr, posIndex3] = getInsertClauseAndBinds(
		inputColumns,
		columnMetaDataObject,
		item,
		bindParams,
		bindDefs,
		posIndex2,
	);

	let query = `MERGE INTO ${quoteSqlIdentifier(schema)}.${quoteSqlIdentifier(table)} t
			USING (SELECT ${sourceSelect} FROM dual) s
			ON (${onClause})
			WHEN MATCHED THEN
			UPDATE SET ${updateSetClause}
			WHEN NOT MATCHED THEN
			INSERT (${insertColsStr}) VALUES (${insertValsStr})
			`;

	const outputColumns = ctx.getNodeParameter('options.outputColumns', 0, []) as string[];
	if (outputColumns.length > 0) {
		query = getOutBindDefsForExecute(
			query,
			columnMetaDataObject,
			outputColumns,
			bindDefs ?? bindParams,
			posIndex3,
		);
	}
	if (executeManyValues) {
		const keysOrder = [...columnsToMatchOn, ...updateColumns, ...inputColumns];

		for (let i = 0; i < items.length; i++) {
			if (dataMode === 'autoMapInputData') {
				item = items[i].json;
			}
			if (dataMode === 'defineBelow') {
				item = ctx.getNodeParameter('columns.value', i) as IDataObject;
			}
			const result = [];
			for (const key of keysOrder) {
				const type = columnMetaDataObject[key].type;
				let value: any = item[key];
				value = getCompatibleValue(type, value);
				result.push(value);
			}
			executeManyValues.push(result);
		}
	}
	return query;
}

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	runQueries: QueriesRunner,
	items: INodeExecutionData[],
	nodeOptions: OracleDBNodeOptions,
	pool: oracleDBTypes.Pool,
): Promise<INodeExecutionData[]> {
	const stmtBatching = (nodeOptions.stmtBatching as QueryMode) || 'single';
	const queries: QueryWithValues[] = [];
	if (stmtBatching === 'single') {
		const executeManyValues: oracleDBTypes.BindParameters[] = [];
		const bindDefs: oracleDBTypes.BindDefinition[] = [];
		const schema = this.getNodeParameter('schema', 0, undefined, {
			extractValue: true,
		}) as string;

		const table = this.getNodeParameter('table', 0, undefined, {
			extractValue: true,
		}) as string;

		const tableSchema = await getColumnMetaData(this.getNode(), pool, schema, table);

		const query = getQuery(
			this,
			items,
			schema,
			table,
			tableSchema,
			[],
			bindDefs,
			0,
			executeManyValues,
		);

		nodeOptions.bindDefs = bindDefs;
		queries.push({ query, executeManyValues });
	} else {
		let schema = this.getNodeParameter('schema', 0, undefined, {
			extractValue: true,
		}) as string;

		let table = this.getNodeParameter('table', 0, undefined, {
			extractValue: true,
		}) as string;
		const updateTableSchema = configureTableSchemaUpdater(this.getNode(), schema, table);
		let tableSchema = await getColumnMetaData(this.getNode(), pool, schema, table);

		for (let i = 0; i < items.length; i++) {
			schema = this.getNodeParameter('schema', i, undefined, {
				extractValue: true,
			}) as string;
			table = this.getNodeParameter('table', i, undefined, {
				extractValue: true,
			}) as string;
			tableSchema = await updateTableSchema(pool, tableSchema, schema, table, i);

			const bindParams: oracleDBTypes.BindParameter[] = []; // bindParameters
			const query = getQuery(this, items, schema, table, tableSchema, bindParams, null, i, null);

			queries.push({ query, values: bindParams });
		}
	}

	return await runQueries(queries, items, nodeOptions);
}
