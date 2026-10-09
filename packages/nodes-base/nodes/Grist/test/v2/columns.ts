// The column schema that Grist returns for the People table in the workflow tests.
const peopleColumns = {
	columns: [
		{ id: 'First', fields: { label: 'First', type: 'Text' } },
		{ id: 'Email', fields: { label: 'Email', type: 'Text' } },
		{ id: 'Sizes', fields: { label: 'Sizes', type: 'ChoiceList' } },
		{ id: 'Letters', fields: { label: 'Letters', type: 'Text' } },
		{
			id: 'FullName',
			fields: {
				label: 'Full Name',
				type: 'Text',
				isFormula: true,
				formula: '$First + " <" + $Email + ">"',
			},
		},
	],
};

// The request for the column types.
export const columnsRequest = (docId = 'doc1') => ({
	method: 'get' as const,
	path: `/docs/${docId}/tables/People/columns`,
	statusCode: 200,
	responseBody: peopleColumns,
});
