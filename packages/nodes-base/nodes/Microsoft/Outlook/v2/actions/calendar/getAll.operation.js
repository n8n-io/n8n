import { updateDisplayOptions } from '@utils/utilities';
import { returnAllOrLimit } from '../../descriptions';
import { microsoftApiRequest, microsoftApiRequestAllItems } from '../../transport';
export const properties = [
    ...returnAllOrLimit,
    {
        displayName: 'Filters',
        name: 'filters',
        type: 'collection',
        placeholder: 'Add Filter',
        default: {},
        options: [
            {
                displayName: 'Filter Query',
                name: 'custom',
                type: 'string',
                default: '',
                placeholder: 'e.g. canShare eq true',
                hint: 'Search query to filter calendars. <a href="https://learn.microsoft.com/en-us/graph/filter-query-parameter">More info</a>.',
            },
        ],
    },
];
const displayOptions = {
    show: {
        resource: ['calendar'],
        operation: ['getAll'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    let responseData;
    const qs = {};
    const returnAll = this.getNodeParameter('returnAll', index);
    const filters = this.getNodeParameter('filters', index, {});
    if (Object.keys(filters).length) {
        const filterString = [];
        if (filters.custom) {
            filterString.push(filters.custom);
        }
        if (filterString.length) {
            qs.$filter = filterString.join(' and ');
        }
    }
    const endpoint = '/calendars';
    if (returnAll) {
        responseData = await microsoftApiRequestAllItems.call(this, 'value', 'GET', endpoint, index, undefined, qs);
    }
    else {
        qs.$top = this.getNodeParameter('limit', index);
        responseData = await microsoftApiRequest.call(this, 'GET', endpoint, index, undefined, qs);
        responseData = responseData.value;
    }
    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: index } });
    return executionData;
}
//# sourceMappingURL=getAll.operation.js.map