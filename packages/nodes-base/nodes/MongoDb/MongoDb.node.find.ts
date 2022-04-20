import { Db } from 'mongodb';
import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { handleObjectId } from './MongoDb.node.utils';

export async function findOps(this: IExecuteFunctions, mdb: Db): Promise<INodeExecutionData[]> {
	try {
		const collection = this.getNodeParameter('collection', 0) as string;
		const options = this.getNodeParameter('options', 0) as IDataObject;
		const filterQuery = JSON.parse(this.getNodeParameter('query', 0) as string);

		let objectIdFields = '_id,';
		if (options.objectIdFields) objectIdFields += options.objectIdFields;
		handleObjectId(filterQuery, objectIdFields as string);

		let query = mdb.collection(collection).find(filterQuery);

		const limit = options.limit as number;
		const skip = options.skip as number;
		const sort = options.sort && JSON.parse(options.sort as string);
		const projection = options.projection && JSON.parse(options.projection as string);

		if (skip > 0) {
			query = query.skip(skip);
		}
		if (limit > 0) {
			query = query.limit(limit);
		}
		if (sort && Object.keys(sort).length !== 0 && sort.constructor === Object) {
			query = query.sort(sort);
		}
		if (projection && Object.keys(projection).length !== 0 && projection.constructor === Object) {
			query = query.project(projection);
		}

		const queryResult = await query.toArray();

		return this.helpers.returnJsonArray(queryResult as IDataObject[]);
	} catch (error) {
		if (this.continueOnFail()) {
			return this.helpers.returnJsonArray({ error: error.message });
		} else {
			throw error;
		}
	}
}
