import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { caseRLC, genericFiltersCollection, returnAllAndLimit, sortCollection, searchOptions, } from '../../descriptions';
import { theHiveApiQuery } from '../../transport';
const properties = [
    {
        displayName: 'Search in Knowledge Base',
        name: 'searchInKnowledgeBase',
        type: 'boolean',
        default: true,
        description: 'Whether to search in knowledge base or only in the selected case',
    },
    {
        ...caseRLC,
        displayOptions: {
            show: {
                searchInKnowledgeBase: [false],
            },
        },
    },
    ...returnAllAndLimit,
    genericFiltersCollection,
    sortCollection,
    {
        ...searchOptions,
        displayOptions: {
            show: {
                returnAll: [true],
            },
        },
    },
];
const displayOptions = {
    show: {
        resource: ['page'],
        operation: ['search'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    let responseData = [];
    const searchInKnowledgeBase = this.getNodeParameter('searchInKnowledgeBase', i);
    const filtersValues = this.getNodeParameter('filters.values', i, []);
    const sortFields = this.getNodeParameter('sort.fields', i, []);
    const returnAll = this.getNodeParameter('returnAll', i);
    let returnCount = false;
    if (!returnAll) {
        returnCount = this.getNodeParameter('options.returnCount', i, false);
    }
    let limit;
    let scope;
    if (searchInKnowledgeBase) {
        scope = { query: 'listOrganisationPage' };
    }
    else {
        const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true });
        scope = { query: 'getCase', id: caseId, restrictTo: 'pages' };
    }
    if (!returnAll) {
        limit = this.getNodeParameter('limit', i);
    }
    responseData = await theHiveApiQuery.call(this, scope, filtersValues, sortFields, limit, returnCount);
    const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=search.operation.js.map