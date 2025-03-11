import mysql2 from 'mysql2/promise';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchResult,
} from 'n8n-workflow';

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

	return await mysql2.createConnection(baseCredentials);
}

export async function searchTables(
	this: ILoadOptionsFunctions,
	query?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('mySql');
	const connection = await createConnection(credentials);
	const sql =
		'SELECT table_name FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = ? and table_name like ? ORDER BY table_name';

	const values = [credentials.database, `%${query ?? ''}%`];
	const formattedQuery = connection.format(sql, values);
	const [rows] = await connection.query(formattedQuery);
	const results = (rows as IDataObject[]).map((r) => ({
		name: r.table_name as string,
		value: r.table_name as string,
	}));
	await connection.end();
	return { results };
}
