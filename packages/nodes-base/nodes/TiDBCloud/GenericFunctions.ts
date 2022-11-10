import {
	ICredentialDataDecryptedObject, ICredentialTestFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData, INodeListSearchItems,
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

export async function tiDBCloudApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	uri: string,
	method: string,
	// tslint:disable-next-line:no-any
	headers: any = {},
	// tslint:disable-next-line:no-any
	body: any = {},
	keySet?: ICredentialDataDecryptedObject): Promise<IDataObject> {
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
		headers,
		uri,
		json: true,
		auth: {
			user: publicKey as string,
			pass: privateKey as string,
			sendImmediately: false,
		},
		body,
	};

	return await this.helpers.request!(options);
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
	return { results };
}

export async function searchCluster(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	let projectId;

	try {
		projectId = (this.getCurrentNodeParameter('project') as IDataObject).value;
		if (projectId === '') {
			throw new Error("Please set parameter");
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}

	const getClustersUrl = `https://api.tidbcloud.com/api/v1beta/projects/${projectId}/clusters?page=1&page_size=100`;
	const response: IDataObject = await tiDBCloudApiRequest.call(this, getClustersUrl, 'GET');
	const results = (response.items as IDataObject[]).map(r => ({
		name: r.name as string,
		value: r.id as string,
	}));

	return { results };
}

export async function searchUser(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	let projectId;
	let clusterId;

	try {
		projectId = (this.getNodeParameter('project', 0) as IDataObject).value;
		clusterId = (this.getNodeParameter('cluster', 0) as IDataObject).value;
		if (projectId === '' || clusterId === '') {
			throw new Error("Please set parameter");
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}

	const getUserUrl = `https://api.tidbcloud.com/api/v1beta/projects/${projectId}/clusters/${clusterId}`;
	const response: IDataObject = await tiDBCloudApiRequest.call(this, getUserUrl, 'GET');
	const default_user = ((response.status as IDataObject).connection_strings as IDataObject).default_user;
	const results = [{
		name: default_user as string,
		value: default_user as string,
	}];
	return { results };
}

async function getConnParaByTiDBCloudApi(this: IExecuteFunctions | ILoadOptionsFunctions): Promise<ICredentialDataDecryptedObject> {
	let projectId;
	let clusterId;
	let user;
	let password;
	let database;

	try {
		projectId = (this.getNodeParameter('project', 0) as IDataObject).value;
		user = (this.getNodeParameter('user', 0) as IDataObject).value;
		clusterId = (this.getNodeParameter('cluster', 0) as IDataObject).value;
		password = this.getNodeParameter('password', 0);
		database = this.getNodeParameter('database', 0);
		if (projectId === '' || user === '' || clusterId === '' || database === '') {
			throw new Error("Please set parameter");
		}

	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}

	const getClusterUrl = `https://api.tidbcloud.com/api/v1beta/projects/${projectId}/clusters/${clusterId}`;
	const response: IDataObject = await tiDBCloudApiRequest.call(this, getClusterUrl, 'GET');
	const connectionString = (response.status as IDataObject).connection_strings as IDataObject;
	const credentials = {
		host: (connectionString.standard as IDataObject).host as string,
		user: user as string,
		port: (connectionString.standard as IDataObject).port as number,
		password: password as string,
		database: database as string,
		enableTls: true,
	};

	return credentials;
}

export async function createCluster(this: IExecuteFunctions) {
	let projectId;
	let clusterName;
	let region;
	let password;

	try {
		projectId = (this.getNodeParameter('project', 0) as IDataObject).value;
		clusterName  = (this.getNodeParameter('clusterName', 0) as IDataObject);
		region  = (this.getNodeParameter('region', 0) as IDataObject);
		password  = (this.getNodeParameter('password', 0) as IDataObject);
		if (projectId === '') {
			throw new Error("Please set parameter");
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}

	// @ts-ignore
	if (!checkClusterName(clusterName)){
		throw new Error("Invalid cluster name");
	}

	const body = {
		name: clusterName,
		cluster_type: 'DEVELOPER',
		cloud_provider: 'AWS',
		region,
		config: {
			root_password: password,
		},
	};
	const createClusterUrl = `https://api.tidbcloud.com/api/v1beta/projects/${projectId}/clusters`;
	return await tiDBCloudApiRequest.call(this, createClusterUrl, 'POST', {}, body);
}

function checkClusterName(clusterName: string): boolean {
	const reg = /^[A-Za-z0-9][-A-Za-z0-9]{2,62}[A-Za-z0-9]$/;
	return reg.test(clusterName);
}

export async function getConnectionParameters(this: IExecuteFunctions | ILoadOptionsFunctions): Promise<ICredentialDataDecryptedObject> {
	return getConnParaByTiDBCloudApi.call(this);
}

export async function createConnection(this: IExecuteFunctions | ILoadOptionsFunctions, credentialsForTest?: ICredentialDataDecryptedObject): Promise<mysql2.Connection> {
	const credentials = credentialsForTest
		? credentialsForTest
		: await getConnectionParameters.call(this) as ICredentialDataDecryptedObject;

	const {enableTls, caCertificate, ...baseCredentials} = credentials;

	if (enableTls) {
		baseCredentials.ssl = {};
		if (caCertificate) {
			baseCredentials.ssl.ca = caCertificate;
		}
		baseCredentials.ssl.rejectUnauthorized = 'false';
		baseCredentials.ssl.minVersion = "TLSv1.2";
	}

	return mysql2.createConnection(baseCredentials);
}

export async function searchTables(
	this: ILoadOptionsFunctions,
	query?: string,
): Promise<INodeListSearchResult> {
	const database = await this.getCurrentNodeParameter('database');
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
