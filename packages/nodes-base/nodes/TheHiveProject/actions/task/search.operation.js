import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { caseRLC, genericFiltersCollection, returnAllAndLimit, searchOptions, sortCollection, } from '../../descriptions';
import { theHiveApiQuery } from '../../transport';
const properties = [
    {
        displayName: 'Search in All Cases',
        name: 'allCases',
        type: 'boolean',
        default: true,
        description: 'Whether to search in all cases or only in a selected case',
    },
    {
        ...caseRLC,
        displayOptions: {
            show: {
                allCases: [false],
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
        resource: ['task'],
        operation: ['search'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    let responseData = [];
    const allCases = this.getNodeParameter('allCases', i);
    const filtersValues = this.getNodeParameter('filters.values', i, []);
    const sortFields = this.getNodeParameter('sort.fields', i, []);
    const returnAll = this.getNodeParameter('returnAll', i);
    const { returnCount, extraData } = this.getNodeParameter('options', i);
    let limit;
    let scope;
    if (allCases) {
        scope = { query: 'listTask' };
    }
    else {
        const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true });
        scope = { query: 'getCase', id: caseId, restrictTo: 'tasks' };
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