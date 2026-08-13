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
	OracleDBNodeOptions,
	QueriesRunner,
	QueryWithValues,
	WhereClause,
} from '../../helpers/interfaces';
import {
	quoteSqlIdentifier,
	addWhereClauses,
	getColumnMetaData,
	getColumnMap,
	getCompatibleValue,
} from '../../helpers/utils';
import {
	combineConditionsCollection,
	optionsCollection,
	whereFixedCollection,
} from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Command',
		name: 'deleteCommand',
		type: 'options',
		default: 'truncate',
		options: [
			{
				name: 'Truncate',
				value: 'truncate',
				description: "Only removes the table's data and preserves the table's structure",
			},
			{
				name: 'Delete',
				value: 'delete',
				description:
					"Delete the rows that match the 'Select Rows' conditions below. If no selection is made, all rows in the table are deleted.",
			},
			{
				name: 'Drop',
				value: 'drop',
				description: "Deletes the table's data and also the table's structure permanently",
			},
		],
	},
	{
		...whereFixedCollection,
		displayOptions: {
			show: {
				deleteCommand: ['delete'],
			},
		},
	},
	{
		...combineConditionsCollection,
		displayOptions: {
			show: {
				deleteCommand: ['delete'],
			},
		},
	},
	...optionsCollection,
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['deleteTable'],
	},
	hide: {
		table: [''],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	runQueries: QueriesRunner,
	items: INodeExecutionData[],
	nodeOptions: OracleDBNodeOptions,
	pool: oracleDBTypes.Pool,
): Promise<INodeExecutionData[]> {
	const queries: QueryWithValues[] = [];

	const stmtBatching = nodeOptions.stmtBatching ?? 'independently';
	if (stmtBatching !== 'single') {
		for (let i = 0; i < items.length; i++) {
			const schema = this.getNodeParameter('schema', i, undefined, {
				extractValue: true,
			}) as string;

			const table = this.getNodeParameter('table', i, undefined, {
				extractValue: true,
			}) as string;

			const deleteCommand = this.getNodeParameter('deleteCommand', i) as string;

			let query = '';
			let values: any = [];

			const quotedTableName = quoteSqlIdentifier(schema) + '.' + quoteSqlIdentifier(table);
			if (deleteCommand === 'drop') {
				query = `DECLARE
        					e_table_missing EXCEPTION;
        					PRAGMA EXCEPTION_INIT(e_table_missing, -942);
    					BEGIN
        				EXECUTE IMMEDIATE ('DROP TABLE ${quotedTableName} PURGE');
    					EXCEPTION
        				WHEN e_table_missing THEN NULL;
    					END;`;
			} else if (deleteCommand === 'truncate') {
				query = `TRUNCATE TABLE ${quotedTableName}`;
			} else if (deleteCommand === 'delete') {
				const whereClauses =
					((this.getNodeParameter('where', i, []) as IDataObject).values as WhereClause[]) || [];
				const combineConditions = this.getNodeParameter('combineConditions', i, 'AND') as string;
				const tableSchema = await getColumnMetaData(this.getNode(), pool, schema, table, i);
				const columnMetaDataObject = getColumnMap(tableSchema);

				[query, values] = addWhereClauses(
					`DELETE FROM ${quotedTableName}`,
					whereClauses,
					combineConditions,
					columnMetaDataObject,
				);
			} else {
				throw new NodeOperationError(
					this.getNode(),
					'Invalid delete command, only drop, delete and truncate are supported ',
					{ itemIndex: i },
				);
			}

			const queryWithValues = { query, values };
			queries.push(queryWithValues);
		}
	} else {
		const deleteCommand = this.getNodeParameter('deleteCommand', 0) as string;

		if (deleteCommand !== 'delete') {
			throw new NodeOperationError(
				this.getNode(),
				'Invalid command for single-mode batching: only DELETE statements are supported.',
				{ itemIndex: 0 },
			);
		}

		const schema = this.getNodeParameter('schema', 0, undefined, {
			extractValue: true,
		}) as string;

		const table = this.getNodeParameter('table', 0, undefined, {
			extractValue: true,
		}) as string;

		let query: string = '';
		let bindDefs: any = [];
		const quotedTableName = quoteSqlIdentifier(schema) + '.' + quoteSqlIdentifier(table);
		const whereClauses =
			((this.getNodeParameter('where', 0, []) as IDataObject).values as WhereClause[]) || [];
		const combineConditions = this.getNodeParameter('combineConditions', 0, 'AND') as string;
		const tableSchema = await getColumnMetaData(this.getNode(), pool, schema, table);
		const columnMetaDataObject = getColumnMap(tableSchema);

		[query, bindDefs] = addWhereClauses(
			`DELETE FROM ${quotedTableName}`,
			whereClauses,
			combineConditions,
			columnMetaDataObject,
			true,
		);

		const executeManyValues = [];
		for (let i = 0; i < items.length; i++) {
			const result = [];
			const whereClauses =
				((this.getNodeParameter('where', i, []) as IDataObject).values as WhereClause[]) || [];

			for (const clause of whereClauses) {
				const type: string = columnMetaDataObject[clause.column].type;
				const value = getCompatibleValue(type, clause.value);
				result.push(value);
			}
			executeManyValues.push(result);
		}

		nodeOptions.bindDefs = bindDefs;
		queries.push({ query, executeManyValues });
	}

	return await runQueries(queries, items, nodeOptions);
}
