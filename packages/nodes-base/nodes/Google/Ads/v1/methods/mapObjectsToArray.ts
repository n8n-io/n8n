import { IDataObject } from 'n8n-workflow';

export function mapObjectsToArray(arr: IDataObject[]): IDataObject[] {
	const res: IDataObject[] = [];
	arr.forEach(obj => {
		const key= Object.keys(obj)[0];
		res.push(obj[key] as IDataObject);
	});
	return res;
}
