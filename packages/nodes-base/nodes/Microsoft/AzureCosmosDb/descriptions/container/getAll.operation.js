import { updateDisplayOptions } from 'n8n-workflow';
import { paginationParameters } from '../common';
const properties = [
    ...paginationParameters,
    {
        displayName: 'Simplify',
        name: 'simple',
        default: true,
        description: 'Whether to return a simplified version of the response instead of the raw data',
        type: 'boolean',
    },
];
const displayOptions = {
    show: {
        resource: ['container'],
        operation: ['getAll'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
//# sourceMappingURL=getAll.operation.js.map