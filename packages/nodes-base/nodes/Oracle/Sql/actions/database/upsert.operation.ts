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

function getQueryAndOutputColumns(
	ctx: IExecuteFunctions,
	items: INodeExecutionData[],
	item: IDataObject,
	schema: string,
	table: string,
	tableSchema: ColumnInfo[],
	bindParams: oracleDBTypes.BindParameter[],
	bindDefs: oracleDBTypes.BindDefinition[] | null,
	index: number,
	executeManyValues: any[] | null = null,
): [string, string[]] {
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

	if (Object.keys(item).length === columnsToMatchOn.length) {
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

	let outputColumns = ctx.getNodeParameter('options.outputColumns', 0, []) as string[];
	if (outputColumns.includes('*')) outputColumns = Object.keys(columnMetaDataObject);

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
			const dataMode = ctx.getNodeParameter('columns.mappingMode', i) as string;

			if (dataMode === 'autoMapInputData') {
				item = items[i].json;
			}
			if (dataMode === 'defineBelow') {
				item = ctx.getNodeParameter('columns.value', i) as IDataObject;
			}
			const result = [];
			for (const key of keysOrder) {
				const type = columnMetaDataObject[key].type;
				const value = getCompatibleValue(type, item[key]);
				result.push(value);
			}
			executeManyValues.push(result);
		}
	}
	return [query, outputColumns];
}

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	runQueries: QueriesRunner,
	items: INodeExecutionData[],
	nodeOptions: OracleDBNodeOptions,
	pool: oracleDBTypes.Pool,
): Promise<INodeExecutionData[]> {
	const stmtBatching = nodeOptions.stmtBatching ?? 'single';
	const queries: QueryWithValues[] = [];
	let item: IDataObject = {};

	let schema = this.getNodeParameter('schema', 0, undefined, {
		extractValue: true,
	}) as string;

	let table = this.getNodeParameter('table', 0, undefined, {
		extractValue: true,
	}) as string;

	let tableSchema = await getColumnMetaData(this.getNode(), pool, schema, table);

	let dataMode = this.getNodeParameter('columns.mappingMode', 0) as string;

	if (stmtBatching === 'single') {
		const executeManyValues: oracleDBTypes.BindParameters[] = [];
		const bindDefs: oracleDBTypes.BindDefinition[] = [];

		if (dataMode === 'autoMapInputData') {
			item = items[0].json;
		} else if (dataMode === 'defineBelow') {
			item = this.getNodeParameter('columns.value', 0) as IDataObject;
		}

		const [query, outputColumns] = getQueryAndOutputColumns(
			this,
			items,
			item,
			schema,
			table,
			tableSchema,
			[],
			bindDefs,
			0,
			executeManyValues,
		);

		nodeOptions.bindDefs = bindDefs;
		queries.push({ query, executeManyValues, outputColumns });
	} else {
		const updateTableSchema = configureTableSchemaUpdater(this.getNode(), schema, table);

		for (let i = 0; i < items.length; i++) {
			dataMode = this.getNodeParameter('columns.mappingMode', i) as string;

			schema = this.getNodeParameter('schema', i, undefined, {
				extractValue: true,
			}) as string;
			table = this.getNodeParameter('table', i, undefined, {
				extractValue: true,
			}) as string;

			if (dataMode === 'autoMapInputData') {
				item = items[i].json;

				// Column refresh is needed only for 'autoMapInputData'
				tableSchema = await updateTableSchema(pool, tableSchema, schema, table, i);
			} else {
				item = this.getNodeParameter('columns.value', i) as IDataObject;
			}

			const bindParams: oracleDBTypes.BindParameter[] = []; // bindParameters
			const [query, outputColumns] = getQueryAndOutputColumns(
				this,
				items,
				item,
				schema,
				table,
				tableSchema,
				bindParams,
				null,
				i,
				null,
			);

			queries.push({ query, values: bindParams, outputColumns });
		}
	}

	return await runQueries(queries, items, nodeOptions);
}
