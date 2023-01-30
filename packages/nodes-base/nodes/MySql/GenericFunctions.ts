import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult,
} from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';
import mysql2 from 'mysql2/promise';

/**
 * Returns of copy of the items which only contains the json data and
 * of that only the define properties
 *
 * @param {INodeExecutionData[]} items The items to copy
 * @param {string[]} properties The properties it should include
 */
export function copyInputItems(items: INodeExecutionData[], properties: string[]): IDataObject[] {
	// Prepare the data to insert and copy it to be returned
	let newItem: IDataObject;
	return items.map((item) => {
		newItem = {};
		for (const property of properties) {
			if (item.json[property] === undefined) {
				newItem[property] = null;
			} else {
				newItem[property] = deepCopy(item.json[property]);
			}
		}
		return newItem;
	});
}

export async function createConnection(
	credentials: ICredentialDataDecryptedObject,
): Promise<mysql2.Connection> {
	const { ssl, caCertificate, clientCertificate, clientPrivateKey, ...baseCredentials } =
		credentials;

	if (ssl) {
		baseCredentials.ssl = {};

		if (caCertificate) {
			baseCredentials.ssl.ca = caCertificate;
		}

		if (clientCertificate || clientPrivateKey) {
			baseCredentials.ssl.cert = clientCertificate;
			baseCredentials.ssl.key = clientPrivateKey;
		}
	}

	return mysql2.createConnection(baseCredentials);
}

export async function searchTables(
	this: ILoadOptionsFunctions,
	query?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('mySql');
	const connection = await createConnection(credentials);
	const sql = `
	SELECT table_name FROM information_schema.tables
	WHERE table_schema = '${credentials.database}'
		and table_name like '%${query || ''}%'
	ORDER BY table_name
	`;
	const [rows] = await connection.query(sql);
	const results = (rows as IDataObject[]).map((r) => ({
		name: r.TABLE_NAME as string,
		value: r.TABLE_NAME as string,
	}));
	await connection.end();
	return { results };
}
