import { updateDisplayOptions } from 'n8n-workflow';
import { containerResourceLocator } from '../common';
const properties = [
    { ...containerResourceLocator, description: 'Select the container you want to retrieve' },
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
        operation: ['get'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
//# sourceMappingURL=get.operation.js.map