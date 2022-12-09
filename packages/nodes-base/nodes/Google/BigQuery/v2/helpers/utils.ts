import { IDataObject } from 'n8n-workflow';

export function simplify(rows: IDataObject[], fields: string[]) {
	const results = [];
	for (const row of rows) {
		const record: IDataObject = {};
		for (const [index, field] of fields.entries()) {
			record[field] = (row.f as IDataObject[])[index].v;
		}
		results.push(record);
	}
	return results;
}
