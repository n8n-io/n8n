import { Db, ObjectId } from 'mongodb';
import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { getItemCopy, handleDateFields, handleObjectIdFields } from './MongoDb.node.utils';

export async function updateOps(
	this: IExecuteFunctions,
	mdb: Db,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const collection = this.getNodeParameter('collection', 0) as string;

	const fields = (this.getNodeParameter('fields', 0) as string)
		.split(',')
		.map((f) => f.trim())
		.filter((f) => !!f);

	const options = this.getNodeParameter('options', 0) as IDataObject;

	let updateKey = this.getNodeParameter('updateKey', 0) as string;
	updateKey = updateKey.trim();

	const updateOptions = (this.getNodeParameter('upsert', 0) as boolean)
		? { upsert: true }
		: {};

	if (!fields.includes(updateKey)) {
		fields.push(updateKey);
	}

	// Prepare the data to update and copy it to be returned
	const updateItems = getItemCopy(items, fields);

	if (options.dateFields) {
		handleDateFields(updateItems, options.dateFields as string);
	}

	if (options.objectIdFields) {
		handleObjectIdFields(updateItems, options.objectIdFields as string);
	}

	for (const item of updateItems) {
		try {
			if (item[updateKey] === undefined) {
				continue;
			}

			const filter: { [key: string]: string | ObjectId } = {};
			filter[updateKey] = item[updateKey] as string;
			if (updateKey === '_id') {
				filter[updateKey] = new ObjectId(filter[updateKey]);
				delete item._id;
			}

			await mdb.collection(collection).updateOne(filter, { $set: item }, updateOptions);
		} catch (error) {
			if (this.continueOnFail()) {
				item.json = { error: error.message };
				continue;
			}
			throw error;
		}
	}

	return this.helpers.returnJsonArray(updateItems);
}
