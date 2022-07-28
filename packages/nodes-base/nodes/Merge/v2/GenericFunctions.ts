import {
	IDataObject,
	INodeExecutionData
} from "n8n-workflow";

export function addSuffixToEntriesKeys(data: INodeExecutionData[], suffix: string) {
	return data.map( entry => {
		const json: IDataObject = {};
		Object.keys(entry.json).forEach( key => {
			json[`${key}_${suffix}`] = entry.json[key];
		});
		return {...entry, json};
	});
}
