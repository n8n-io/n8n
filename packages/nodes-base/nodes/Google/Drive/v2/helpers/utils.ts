export function prepareQueryString(fields: string[] | undefined) {
	let queryFields = 'id, name';
	if (fields) {
		if (fields.includes('*')) {
			queryFields = '*';
		} else {
			queryFields = fields.join(', ');
		}
	}
	return queryFields;
}
