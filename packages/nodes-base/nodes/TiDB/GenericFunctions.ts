import {
	ICredentialDataDecryptedObject, ICredentialTestFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult, NodeApiError,
} from 'n8n-workflow';

import mysql2 from 'mysql2/promise';
import {IExecuteFunctions} from "n8n-core";
import {OptionsWithUri} from 'request';

/**
 * Returns of copy of the items which only contains the json data and
 * of that only to define properties
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

export async function tiDBCloudApiRequest(this: IExecuteFunctions | ILoadOptionsFunctions, uri: string, method: string, keySet?: ICredentialDataDecryptedObject): Promise<IDataObject> {
	let publicKey;
	let privateKey;

	if (keySet) {
		publicKey = keySet.publicKey;
		privateKey = keySet.privateKey;
	} else {
		const tiDBCloudAuth = await this.getCredentials('tiDBCloudApi');
		publicKey = tiDBCloudAuth.publicKey;
		privateKey = tiDBCloudAuth.privateKey;
	}

	const options: OptionsWithUri = {
		method,
		headers: {},
		uri,
		json: true,
		auth: {
			user: publicKey as string,
			pass: privateKey as string,
			sendImmediately: false,
		},
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new Error(`Failed to send request to TiDB Cloud: ${error.message}`);
	}
}

export async function tiDBCloudAuth(this: ICredentialTestFunctions, credentialForTest: ICredentialDataDecryptedObject) {
	const tiDBCloudAuthUrl = 'https://api.tidbcloud.com/api/v1beta/projects';
	// @ts-ignore
	return await tiDBCloudApiRequest.call(this, tiDBCloudAuthUrl, 'GET', credentialForTest);
}

export async function searchProject(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const getProjectUrl = 'https://api.tidbcloud.com/api/v1beta/projects';
	const response: IDataObject = await tiDBCloudApiRequest.call(this, getProjectUrl, 'GET');
	const results = (response.items as IDataObject[]).map(r => ({
		name: r.name as string,
		value: r.id as string,
	}));
	return {results};
}

export async function searchCluster(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	let projectId;
	try {
		projectId = (this.getCurrentNodeParameter('project') as IDataObject).value;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
	if (projectId === '') {
		throw new Error("Please set project");
	}
	const getClustersUrl = `https://api.tidbcloud.com/api/v1beta/projects/${projectId}/clusters?page=1&page_size=100`;
	const response: IDataObject = await tiDBCloudApiRequest.call(this, getClustersUrl, 'GET');
	const results = (response.items as IDataObject[]).map(r => ({
		name: r.name as string,
		value: r.id as string,
	}));
	return {results};
}

async function getConnParaByTiDBCloudApi(this: IExecuteFunctions | ILoadOptionsFunctions): Promise<ICredentialDataDecryptedObject> {
	let projectId;
	let clusterId;
	let password;
	let database;
	let addCaCertificate;
	let caCertificate;
	let connectionString;
	let credentials;

	try {
		projectId = (this.getNodeParameter('project', 0) as IDataObject).value;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
	if (projectId === '') {
		throw new Error("Please set project");
	}

	try {
		clusterId = (this.getNodeParameter('cluster', 0) as IDataObject).value;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
	if (clusterId === '') {
		throw new Error("Please set project");
	}

	try {
		password = this.getNodeParameter('password', 0);
		database = this.getNodeParameter('database', 0);
		addCaCertificate = this.getNodeParameter('addCaCertificate', 0);
		if (addCaCertificate === true) {
			caCertificate = this.getNodeParameter('caCertificate', 0);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}

	const getClusterUrl = `https://api.tidbcloud.com/api/v1beta/projects/${projectId}/clusters/${clusterId}`;
	const response: IDataObject = await tiDBCloudApiRequest.call(this, getClusterUrl, 'GET');

	try {
		connectionString = (response.status as IDataObject).connection_strings as IDataObject;
		credentials = {
			host: (connectionString.standard as IDataObject).host as string,
			user: connectionString.default_user as string,
			port: 4000,
			password: password as string,
			database: database as string,
			enableTls: true,
			addCaCertificate: addCaCertificate as boolean,
			caCertificate: caCertificate as string,
		};
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}

	return credentials;
}

export async function getConnectionParameters(this: IExecuteFunctions | ILoadOptionsFunctions): Promise<ICredentialDataDecryptedObject> {
	let tiDBAuth;
	let tiDBCloudAuth;

	try {
		tiDBAuth = await this.getCredentials('tiDBApi');
	} catch (error) {
	}
	try {
		tiDBCloudAuth = await this.getCredentials('tiDBCloudApi');
	} catch (error) {
	}

	if (tiDBAuth) {
		return tiDBAuth;
	} else if (tiDBCloudAuth) {
		return getConnParaByTiDBCloudApi.call(this);
	} else {
		throw new Error("Please set credentials first!");
	}
}

export async function createConnection(this: IExecuteFunctions | ILoadOptionsFunctions, credentialsForTest?: ICredentialDataDecryptedObject): Promise<mysql2.Connection> {
	const credentials = credentialsForTest
		? credentialsForTest
		: await getConnectionParameters.call(this) as ICredentialDataDecryptedObject;

	const {enableTls, addCaCertificate, caCertificate, ...baseCredentials} = credentials;

	if (enableTls) {
		baseCredentials.ssl = {};
		if (addCaCertificate) {
			baseCredentials.ssl.ca = caCertificate;
		}
		baseCredentials.ssl.minVersion = "TLSv1.2";
	}

	return mysql2.createConnection(baseCredentials);
}

export async function searchTables(
	this: ILoadOptionsFunctions,
	query?: string,
): Promise<INodeListSearchResult> {
	let database;
	let credentials;
	try {
		credentials = await this.getCredentials('tiDBApi');
	} catch (error) {
	}
	if (credentials) {
		database = credentials.database;
	} else {
		database = await this.getCurrentNodeParameter('database');
	}
	const connection = await createConnection.call(this);
	const sql = `
		SELECT table_name
		FROM information_schema.tables
		WHERE table_schema = '${database}'
			and table_name like '%${query || ''}%'
		ORDER BY table_name
	`;
	const [rows] = await connection.query(sql);
	const results = (rows as IDataObject[]).map(r => ({
		name: r.table_name as string,
		value: r.table_name as string,
	}));
	connection.end();
	return {results};
}
