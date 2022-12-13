import { IDataObject } from 'n8n-workflow';

export function simplify(rows: IDataObject[], fields: Array<string | IDataObject>) {
	if (!Array.isArray(rows)) {
		return (fields as IDataObject[]).reduce((acc, field, index) => {
			if (typeof field === 'string') {
				const rowData = ((rows as IDataObject).f as IDataObject[])[index].v;
				acc[field] = Array.isArray(rowData) ? rowData.map((entry) => entry.v) : rowData;
			} else {
				const name = Object.keys(field)[0];
				const rowData = ((rows as IDataObject).f as IDataObject[])[index].v as IDataObject[];

				acc[name] = simplify(rowData, field[name] as Array<string | IDataObject>);
				// acc[name] = rowData;
			}
			return acc;
		}, {} as IDataObject);
	}
	const results = [];

	for (const row of rows) {
		const record: IDataObject = {};
		for (const [index, field] of fields.entries()) {
			if (typeof field === 'string') {
				if (row.f) {
					record[field] = (row.f as IDataObject[])[index].v;
				} else {
					if (row.v) {
						record[field] = (((row.v as IDataObject).f as IDataObject[]) || []).map(
							(entry) => entry.v,
						);
					}
				}
			} else {
				const name = Object.keys(field)[0];
				const rowData = (row.f as IDataObject[])[index].v as IDataObject[];

				record[name] = rowData.map((entry) =>
					simplify(entry.v as IDataObject[], field[name] as Array<string | IDataObject>),
				);
			}
		}
		results.push(record);
	}
	return results;
}

export function extractSchemaFields(entry: IDataObject): string | IDataObject {
	const name = entry.name as string;
	const entryFields = entry.fields as IDataObject[];
	if (!entryFields) {
		return name;
	}
	return { [name]: entryFields.map(extractSchemaFields) };
}
