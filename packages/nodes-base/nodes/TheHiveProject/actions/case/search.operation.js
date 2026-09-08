import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { genericFiltersCollection, returnAllAndLimit, searchOptions, sortCollection, } from '../../descriptions';
import { theHiveApiQuery } from '../../transport';
const properties = [
    ...returnAllAndLimit,
    genericFiltersCollection,
    sortCollection,
    searchOptions,
];
const displayOptions = {
    show: {
        resource: ['case'],
        operation: ['search'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    let responseData = [];
    const filtersValues = this.getNodeParameter('filters.values', i, []);
    const sortFields = this.getNodeParameter('sort.fields', i, []);
    const returnAll = this.getNodeParameter('returnAll', i);
    const { returnCount, extraData } = this.getNodeParameter('options', i);
    let limit;
    if (!returnAll) {
        limit = this.getNodeParameter('limit', i);
    }
    responseData = await theHiveApiQuery.call(this, { query: 'listCase' }, filtersValues, sortFields, limit, returnCount, extraData);
    const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=search.operation.js.map