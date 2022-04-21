import { Db, ObjectId } from 'mongodb';
import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, JsonObject } from 'n8n-workflow';

export async function aggregateOps(this: IExecuteFunctions, mdb: Db): Promise<INodeExecutionData[]> {
	try {
		const queryParameter = JSON.parse(this.getNodeParameter('query', 0) as string);

		if (queryParameter._id && typeof queryParameter._id === 'string') {
			queryParameter._id = new ObjectId(queryParameter._id);
		}

		const query = mdb
			.collection(this.getNodeParameter('collection', 0) as string)
			.aggregate(queryParameter);

		const queryResult = await query.toArray();

		return this.helpers.returnJsonArray(queryResult as IDataObject[]);
	} catch (error) {
		if (this.continueOnFail()) {
			return this.helpers.returnJsonArray({ error: (error as JsonObject).message });
		} else {
			throw error;
		}
	}
}
