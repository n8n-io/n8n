import { MongoClient } from 'mongodb';
import { IExecuteFunctions } from 'n8n-core';
import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { aggregateOps } from './MongoDb.node.aggregate';
import { bulkUpdateOps } from './MongoDb.node.bulkUpdate';
import { deleteOps } from './MongoDb.node.delete';
import { findOps } from './MongoDb.node.find';
import { insertOps } from './MongoDb.node.insert';
import { nodeDescription } from './MongoDb.node.options';
import { updateOps } from './MongoDb.node.update';
import { validateAndResolveMongoCredentials } from './MongoDb.node.utils';

export class MongoDb implements INodeType {
	description: INodeTypeDescription = nodeDescription;
	methods = {
		credentialTest: {
			async mongoDBConnectionTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				try {
					const credentials = credential.data as IDataObject;

					let connectionString = '';
					if (credentials.configurationType === 'connectionString') {
						connectionString = (credentials.connectionString as string).trim();
					} else {
						if (credentials.port) {
							connectionString = `mongodb://${credentials.user}:${credentials.password}@${credentials.host}:${credentials.port}`;
						} else {
							connectionString = `mongodb+srv://${credentials.user}:${credentials.password}@${credentials.host}`;
						}
					}

					await MongoClient.connect(connectionString);

					return {
						status: 'OK',
						message: 'Authentication successful',
					};
				} catch (error) {
					return {
						status: 'Error',
						message: error.message,
					};
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const { database, connectionString } = validateAndResolveMongoCredentials(
			this,
			await this.getCredentials('mongoDb'),
		);

		const client: MongoClient = await MongoClient.connect(connectionString);

		const mdb = client.db(database);

		let returnItems: INodeExecutionData[] = [];

		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as string;

		if (operation === 'aggregate') {
			returnItems = await aggregateOps.call(this, mdb);
		} else if (operation === 'delete') {
			returnItems = await deleteOps.call(this, mdb);
		} else if (operation === 'find') {
			returnItems = await findOps.call(this, mdb);
		} else if (operation === 'insert') {
			returnItems = await insertOps.call(this, mdb, items);
		} else if (operation === 'update') {
			returnItems = await updateOps.call(this, mdb, items);
		} else if (operation === 'bulkUpdate') {
			returnItems = await bulkUpdateOps.call(this, mdb, items);
		} else if (this.continueOnFail()) {
			returnItems = this.helpers.returnJsonArray({
				json: { error: `The operation "${operation}" is not supported!` },
			});
		} else {
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported!`,
			);
		}
		client.close();
		return this.prepareOutputData(returnItems);
	}
}
