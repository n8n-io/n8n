import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { createPool } from '../transport';

import { Client } from 'ssh2';

export async function getColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials('mySql');
	const nodeOptions = this.getNodeParameter('options', 0) as IDataObject;

	let sshClient: Client | undefined = undefined;

	if (credentials.sshTunnel) {
		sshClient = new Client();
	}
	const pool = await createPool(credentials, nodeOptions, sshClient);

	try {
		const connection = await pool.getConnection();

		const table = this.getNodeParameter('table', 0, {
			extractValue: true,
		}) as string;

		const columns = (
			await connection.query(
				`SHOW COLUMNS FROM \`${table}\` FROM \`${credentials.database as string}\``,
			)
		)[0] as IDataObject[];

		connection.release();

		return (columns || []).map((column: IDataObject) => ({
			name: column.Field as string,
			value: column.Field as string,
			// eslint-disable-next-line n8n-nodes-base/node-param-description-lowercase-first-char
			description: `type: ${(column.Type as string).toUpperCase()}, nullable: ${
				column.Null as string
			}`,
		}));
	} catch (error) {
		throw error;
	} finally {
		if (sshClient) {
			sshClient.end();
		}
		await pool.end();
	}
}

export async function getColumnsMultiOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData = await getColumns.call(this);
	const returnAll = { name: '*', value: '*', description: 'All columns' };
	return [returnAll, ...returnData];
}

export async function getColumnsWithoutColumnToMatchOn(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const columnToMatchOn = this.getNodeParameter('columnToMatchOn') as string;
	const returnData = await getColumns.call(this);
	return returnData.filter((column) => column.value !== columnToMatchOn);
}
