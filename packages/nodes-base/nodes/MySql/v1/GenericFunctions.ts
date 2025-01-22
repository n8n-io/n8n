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
