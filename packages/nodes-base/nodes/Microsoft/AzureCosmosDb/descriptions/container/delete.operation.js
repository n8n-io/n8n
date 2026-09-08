import { updateDisplayOptions } from 'n8n-workflow';
import { containerResourceLocator } from '../common';
const properties = [
    { ...containerResourceLocator, description: 'Select the container you want to delete' },
];
const displayOptions = {
    show: {
        resource: ['container'],
        operation: ['delete'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
//# sourceMappingURL=delete.operation.js.map