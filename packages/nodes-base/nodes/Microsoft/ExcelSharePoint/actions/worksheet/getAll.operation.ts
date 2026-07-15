import { createGetAllOperation } from '../createGetAllOperation';

// https://learn.microsoft.com/en-us/graph/api/workbook-list-worksheets
export const { description, execute } = createGetAllOperation({
	resource: 'worksheet',
	endpointSuffix: '/workbook/worksheets',
});
