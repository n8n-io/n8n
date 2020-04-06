import { IExecuteFunctions } from "n8n-core";
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from "n8n-workflow";
import { nodeDescription } from "./mongo.node.options";
import { MongoClient } from "mongodb";
import { getItemCopy, buildParameterizedConnString } from "./mongo.node.utils";

export class MongoDb implements INodeType {
	description: INodeTypeDescription = nodeDescription;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = this.getCredentials("mongoDb");

		// user can optionally override connection string
		const useOverriddenConnString = this.getNodeParameter(
			"shouldOverrideConnString",
			0
		) as boolean;

		if (credentials === undefined) {
			throw new Error("No credentials got returned!");
		}

		let connectionUri = "";
		if (useOverriddenConnString === true) {
			const connStringInput = this.getNodeParameter(
				"connStringOverrideVal",
				0
			) as string;
			if (connStringInput && connStringInput.length > 0) {
				connectionUri = connStringInput;
			} else {
				throw new Error(
					"Cannot override credentials: valid MongoDB connection string not provided "
				);
			}
		} else {
			connectionUri = buildParameterizedConnString(credentials);
		}

		const client: MongoClient = await MongoClient.connect(connectionUri, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});

		const mdb = client.db(credentials.database as string);

		let returnItems = [];

		const items = this.getInputData();
		const operation = this.getNodeParameter("operation", 0) as string;

		if (operation === "find") {
			// ----------------------------------
			//         find
			// ----------------------------------

			const queryResult = await mdb
				.collection(this.getNodeParameter("collection", 0) as string)
				.find(JSON.parse(this.getNodeParameter("query", 0) as string))
				.toArray();

			returnItems = this.helpers.returnJsonArray(queryResult as IDataObject[]);
		} else if (operation === "insert") {
			// ----------------------------------
			//         insert
			// ----------------------------------

			// Prepare the data to insert and copy it to be returned
			const fields = (this.getNodeParameter("fields", 0) as string)
				.split(",")
				.map((f) => f.trim())
				.filter((f) => !!f);

			const insertItems = getItemCopy(items, fields);

			const { insertedIds } = await mdb
				.collection(this.getNodeParameter("collection", 0) as string)
				.insertMany(insertItems);

			// Add the id to the data
			for (const i of Object.keys(insertedIds)) {
				returnItems.push({
					json: {
						...insertItems[parseInt(i, 10)],
						id: insertedIds[parseInt(i, 10)] as string,
					},
				});
			}
		} else if (operation === "update") {
			// ----------------------------------
			//         update
			// ----------------------------------

			const fields = (this.getNodeParameter("fields", 0) as string)
				.split(",")
				.map((f) => f.trim())
				.filter((f) => !!f);

			let updateKey = this.getNodeParameter("updateKey", 0) as string;
			updateKey = updateKey.trim();

			if (!fields.includes(updateKey)) {
				fields.push(updateKey);
			}

			// Prepare the data to update and copy it to be returned
			const updateItems = getItemCopy(items, fields);

			for (const item of updateItems) {
				if (item[updateKey] === undefined) {
					continue;
				}

				const filter: { [key: string]: string } = {};
				filter[updateKey] = item[updateKey] as string;

				await mdb
					.collection(this.getNodeParameter("collection", 0) as string)
					.updateOne(filter, { $set: item });
			}

			returnItems = this.helpers.returnJsonArray(updateItems as IDataObject[]);
		} else {
			throw new Error(`The operation "${operation}" is not supported!`);
		}

		return this.prepareOutputData(returnItems);
	}
}
