import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { taskRLC, genericFiltersCollection, returnAllAndLimit, sortCollection, searchOptions, } from '../../descriptions';
import { theHiveApiQuery } from '../../transport';
const properties = [
    {
        displayName: 'Search in All Tasks',
        name: 'allTasks',
        type: 'boolean',
        default: true,
        description: 'Whether to search in all tasks or only in selected task',
    },
    {
        ...taskRLC,
        displayOptions: {
            show: {
                allTasks: [false],
            },
        },
    },
    ...returnAllAndLimit,
    genericFiltersCollection,
    sortCollection,
    searchOptions,
];
const displayOptions = {
    show: {
        resource: ['log'],
        operation: ['search'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    let responseData = [];
    const allTasks = this.getNodeParameter('allTasks', i);
    const filtersValues = this.getNodeParameter('filters.values', i, []);
    const sortFields = this.getNodeParameter('sort.fields', i, []);
    const returnAll = this.getNodeParameter('returnAll', i);
    const { returnCount, extraData } = this.getNodeParameter('options', i);
    let limit;
    let scope;
    if (allTasks) {
        scope = { query: 'listLog' };
    }
    else {
        const taskId = this.getNodeParameter('taskId', i, '', { extractValue: true });
        scope = { query: 'getTask', id: taskId, restrictTo: 'logs' };
    }
    if (!returnAll) {
        limit = this.getNodeParameter('limit', i);
    }
    responseData = await theHiveApiQuery.call(this, scope, filtersValues, sortFields, limit, returnCount, extraData);
    const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=search.operation.js.map