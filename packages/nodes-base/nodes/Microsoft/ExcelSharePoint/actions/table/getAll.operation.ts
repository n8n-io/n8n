import { createGetAllOperation } from '../createGetAllOperation';

// https://learn.microsoft.com/en-us/graph/api/workbook-list-tables
export const { description, execute } = createGetAllOperation({
	resource: 'table',
	endpointSuffix: '/workbook/tables',
});
