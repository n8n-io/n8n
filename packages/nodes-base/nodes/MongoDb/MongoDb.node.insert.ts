import { Db } from 'mongodb';
import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { getItemCopy, handleDateFields, handleObjectIdFields } from './MongoDb.node.utils';

export async function insertOps(
	this: IExecuteFunctions,
	mdb: Db,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnItems: INodeExecutionData[] = [];

	try {
		const collection = this.getNodeParameter('collection', 0) as string;

		// Prepare the data to insert and copy it to be returned
		const fields = (this.getNodeParameter('fields', 0) as string)
			.split(',')
			.map((f) => f.trim())
			.filter((f) => !!f);

		const options = this.getNodeParameter('options', 0) as IDataObject;

		const insertItems = getItemCopy(items, fields);

		if (options.dateFields) {
			handleDateFields(insertItems, options.dateFields as string);
		}

		if (options.objectIdFields) {
			handleObjectIdFields(insertItems, options.objectIdFields as string);
		}

		const { insertedIds } = await mdb.collection(collection).insertMany(insertItems);

		// Add the id to the data
		for (const i of Object.keys(insertedIds)) {
			returnItems.push({
				json: {
					...insertItems[parseInt(i, 10)],
					id: insertedIds[parseInt(i, 10)] as unknown as string,
				},
			});
		}

		return returnItems;
	} catch (error) {
		if (this.continueOnFail()) {
			return this.helpers.returnJsonArray({ error: error.message });
		} else {
			throw error;
		}
	}
}
