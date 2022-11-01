import {
	ICredentialDataDecryptedObject, ICredentialTestFunctions,
	IDataObject,
	IHttpRequestHelper,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult,
} from 'n8n-workflow';
import mysql2 from 'mysql2/promise';
import {IExecuteFunctions} from "n8n-core";

const getProjectUrl = 'https://api.tidbcloud.com/api/v1beta/projects';

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
				newItem[property] = JSON.parse(JSON.stringify(item.json[property]));
			}
		}
		return newItem;
	});
}

export async  function createConnection(fun: ICredentialTestFunctions | IExecuteFunctions | ILoadOptionsFunctions,
																	credentials: ICredentialDataDecryptedObject): Promise<mysql2.Connection> {
	let hostname, username, password;
	const result = await fun.helpers.httpRequest(
		{
			method: 'GET',
			auth: {
				username: credentials.publicKey as string,
				password: credentials.privateKey as string,
			},
			url: getProjectUrl,
		},
	);
	hostname = "";
	username = "";
	password = "";
	return result;
	// const { ssl, caCertificate, clientCertificate, clientPrivateKey, ...baseCredentials } =
	// 	credentials;
	//
	// if (ssl) {
	// 	baseCredentials.ssl = {};
	//
	// 	if (caCertificate) {
	// 		baseCredentials.ssl.ca = caCertificate;
	// 	}
	//
	// 	if (clientCertificate || clientPrivateKey) {
	// 		baseCredentials.ssl.cert = clientCertificate;
	// 		baseCredentials.ssl.key = clientPrivateKey;
	// 	}
	//
	// 	baseCredentials.ssl.minVersion = "TLSv1.2";
	//
	// 	baseCredentials.ssl.rejectUnauthorized = true;
	// }
	//
	return mysql2.createConnection("");
}

export async function searchTables(
	this: ILoadOptionsFunctions,
	query?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('tiDBApi');
	const connection = await createConnection(this, credentials);
	const sql = `
	SELECT table_name FROM information_schema.tables
	WHERE table_schema = '${credentials.database}'
		and table_name like '%${query || ''}%'
	ORDER BY table_name
	`;
	const [rows] = await connection.query(sql);
	const results = (rows as IDataObject[]).map(r => ({
		name: r.table_name as string,
		value: r.table_name as string,
	}));
	connection.end();
	return { results };
}
