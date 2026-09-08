import { searchProperties } from './common.descriptions';
import { updateDisplayOptions } from '../../../utils/utilities';
const searchDisplayOptions = {
    show: {
        resource: ['object'],
        operation: ['search'],
    },
};
const searchDescription = updateDisplayOptions(searchDisplayOptions, searchProperties);
export const objectOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        displayOptions: {
            show: {
                resource: ['object'],
            },
        },
        noDataExpression: true,
        options: [
            {
                name: 'Search',
                value: 'search',
                action: 'Get a filtered list of objects',
            },
        ],
        default: 'search',
    },
];
export const objectFields = [
    // ----------------------------------------
    //              event: search
    // ----------------------------------------
    ...searchDescription,
];
//# sourceMappingURL=ObjectDescription.js.map