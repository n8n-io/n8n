import {
	ICredentialDataDecryptedObject, ICredentialTestFunctions,
	IDataObject,
	IHttpRequestHelper,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult, NodeApiError,
} from 'n8n-workflow';
import mysql2 from 'mysql2/promise';
import {IExecuteFunctions} from "n8n-core";
import {OptionsWithUri} from 'request';

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

// export function tiDBCloudAuth(this: ICredentialTestFunctions | IExecuteFunctions | ILoadOptionsFunctions)  {
//
//
// }


export async function tiDBCloudApiRequest(this: IExecuteFunctions | ILoadOptionsFunctions, uri: string, method: string): Promise<IDataObject> {
	let tiDBCloudAuth;
	try {
		tiDBCloudAuth = await this.getCredentials('tiDBCloudApi');
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}

	const options: OptionsWithUri = {
		method,
		headers: {},
		uri,
		json: true,
		auth: {
			user: tiDBCloudAuth.publicKey as string,
			pass: tiDBCloudAuth.privateKey as string,
			sendImmediately: false,
		},
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
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

// export async function searchDatabase(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
// 	const projectId = this.getCurrentNodeParameter('project');
// 	const getClustersUrl = `https://api.tidbcloud.com/api/v1beta/projects/"${projectId}"/clusters?page=1&page_size=100`;
// 	const response: IDataObject = await tiDBCloudApiRequest.call(this, getClustersUrl, 'GET');
// 	const results = (response.items as IDataObject[]).map(r => ({
// 		name: r.name as string,
// 		value: r.name as string,
// 	}));
//
// 	return { results };
// }

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

	console.log(this.getNode());
	try {
		password = this.getNodeParameter('password', 0);
		console.log(password);
		database = this.getNodeParameter('database', 0);
		console.log(database);
		addCaCertificate = this.getNodeParameter('addCaCertificate', 0);
		console.log(addCaCertificate);
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

export async function createConnection(this: IExecuteFunctions | ILoadOptionsFunctions): Promise<mysql2.Connection> {
	const credentials = await getConnectionParameters.call(this) as ICredentialDataDecryptedObject;

	const {addCaCertificate, caCertificate, ...baseCredentials} = credentials;

	baseCredentials.ssl = {};

	if (addCaCertificate) {
		baseCredentials.ssl.ca = caCertificate;
	}

	baseCredentials.ssl.minVersion = "TLSv1.2";

	baseCredentials.ssl.rejectUnauthorized = true;

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
