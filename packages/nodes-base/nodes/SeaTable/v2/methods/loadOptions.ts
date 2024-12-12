import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import type { IRow } from '../actions/Interfaces';
import { getTableColumns, seaTableApiRequest, updateAble } from '../GenericFunctions';

export async function getTableNames(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	// this.getCurrentNodeParameter('viewName'); // das kommt vom trigger. Brauche ich das???
	const {
		metadata: { tables },
	} = await seaTableApiRequest.call(
		this,
		{},
		'GET',
		'/dtable-server/api/v1/dtables/{{dtable_uuid}}/metadata',
	);
	for (const table of tables) {
		returnData.push({
			name: table.name,
			value: table.name,
		});
	}
	return returnData;
}

export async function getTableNameAndId(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const {
		metadata: { tables },
	} = await seaTableApiRequest.call(
		this,
		{},
		'GET',
		'/dtable-server/api/v1/dtables/{{dtable_uuid}}/metadata',
	);
	for (const table of tables) {
		returnData.push({
			name: table.name,
			value: table.name + ':::' + table._id,
		});
	}
	return returnData;
}

export async function getSearchableColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const tableName = this.getCurrentNodeParameter('tableName') as string;
	if (tableName) {
		const columns = await seaTableApiRequest.call(
			this,
			{},
			'GET',
			'/dtable-server/api/v1/dtables/{{dtable_uuid}}/columns',
			{},
			{ table_name: tableName },
		);
		for (const col of columns.columns) {
			if (
				col.type === 'text' ||
				col.type === 'long-text' ||
				col.type === 'number' ||
				col.type === 'single-select' ||
				col.type === 'email' ||
				col.type === 'url' ||
				col.type === 'rate' ||
				col.type === 'formula'
			) {
				returnData.push({
					name: col.name,
					value: col.name,
				});
			}
		}
	}
	return returnData;
}

export async function getLinkColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const table = this.getCurrentNodeParameter('tableName') as string;

	const tableName = table.split(':::')[0];
	const tableId = table.split(':::')[1];

	if (tableName) {
		const columns = await seaTableApiRequest.call(
			this,
			{},
			'GET',
			'/dtable-server/api/v1/dtables/{{dtable_uuid}}/columns',
			{},
			{ table_name: tableName },
		);
		for (const col of columns.columns) {
			if (col.type === 'link') {
				// make sure that the "other table id" is returned and not the same table id again.
				const otid =
					tableId !== col.data.other_table_id ? col.data.other_table_id : col.data.table_id;

				returnData.push({
					name: col.name,
					value: col.name + ':::' + col.data.link_id + ':::' + otid,
				});
			}
		}
	}
	return returnData;
}

export async function getLinkColumnsWithColumnKey(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const table = this.getCurrentNodeParameter('tableName') as string;

	const tableName = table.split(':::')[0];
	const tableId = table.split(':::')[1];

	if (tableName) {
		const columns = await seaTableApiRequest.call(
			this,
			{},
			'GET',
			'/dtable-server/api/v1/dtables/{{dtable_uuid}}/columns',
			{},
			{ table_name: tableName },
		);
		for (const col of columns.columns) {
			if (col.type === 'link') {
				// make sure that the "other table id" is returned and not the same table id again.
				const otid =
					tableId !== col.data.other_table_id ? col.data.other_table_id : col.data.table_id;

				returnData.push({
					name: col.name,
					value: col.name + ':::' + col.data.link_id + ':::' + otid + ':::' + col.key,
				});
			}
		}
	}
	return returnData;
}

export async function getAssetColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const tableName = this.getCurrentNodeParameter('tableName') as string;
	if (tableName) {
		const columns = await seaTableApiRequest.call(
			this,
			{},
			'GET',
			'/dtable-server/api/v1/dtables/{{dtable_uuid}}/columns',
			{},
			{ table_name: tableName },
		);
		for (const col of columns.columns) {
			if (col.type === 'image' || col.type === 'file') {
				returnData.push({
					name: col.name,
					value: col.name + ':::' + col.type,
				});
			}
		}
	}
	return returnData;
}

export async function getSignatureColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const tableName = this.getCurrentNodeParameter('tableName') as string;
	if (tableName) {
		// only execute if table is selected
		const columns = await seaTableApiRequest.call(
			this,
			{},
			'GET',
			'/dtable-server/api/v1/dtables/{{dtable_uuid}}/columns',
			{},
			{ table_name: tableName },
		);
		for (const col of columns.columns) {
			if (col.type === 'digital-sign') {
				// file+image are difficult: every time the row changes, all files trigger.
				returnData.push({
					name: col.name,
					value: col.name,
				});
			}
		}
	}
	return returnData;
}

export async function getTableUpdateAbleColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const tableName = this.getNodeParameter('tableName') as string;
	let columns = await getTableColumns.call(this, tableName);

	// remove columns that could not be filled
	columns = updateAble(columns);

	return columns
		.filter((column) => column.editable)
		.map((column) => ({ name: column.name, value: column.name }));
}

export async function getRowIds(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const table = this.getCurrentNodeParameter('tableName') as string;
	let tableName = table;

	if (table.indexOf(':::') !== -1) {
		tableName = table.split(':::')[0];
	}

	const returnData: INodePropertyOptions[] = [];
	if (tableName) {
		const sqlResult = await seaTableApiRequest.call(
			this,
			{},
			'POST',
			'/dtable-db/api/v1/query/{{dtable_uuid}}/',
			{
				sql: `SELECT * FROM \`${tableName}\` LIMIT 1000`,
				convert_keys: false,
			},
		);
		const rows = sqlResult.results as IRow[];

		for (const row of rows) {
			returnData.push({
				name: row['0000'] + ' (' + row._id + ')',
				value: row._id,
			});
		}
	}
	return returnData;
}

export async function getTableViews(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const tableName = this.getCurrentNodeParameter('tableName') as string;
	if (tableName) {
		// only execute if table is selected, to avoid unnecessary API requests
		const { views } = await seaTableApiRequest.call(
			this,
			{},
			'GET',
			'/dtable-server/api/v1/dtables/{{dtable_uuid}}/views',
			{},
			{ table_name: tableName },
		);
		returnData.push({
			name: '<Do not limit to a view>',
			value: '',
		});
		for (const view of views) {
			returnData.push({
				name: view.name,
				value: view.name,
			});
		}
	}
	return returnData;
}
