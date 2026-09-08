import { extractResourceId } from '../../../shared/GenericFunctions';
import { flattenDataSources, getSearchSort, handleOperationError, simplifyObjects, } from '../../helpers/utils';
import { notionApiRequestAllItemsV3, notionApiRequestV3 } from '../../transport';
import { dataSourceLocator, returnAllOrLimit, searchOptions, simplify, } from '../common.descriptions';
export const description = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['dataSource'],
            },
        },
        options: [
            {
                name: 'Get',
                value: 'get',
                description: 'Get a data source',
                action: 'Get a data source',
            },
            {
                name: 'Search',
                value: 'search',
                description: 'Search data sources',
                action: 'Search data sources',
            },
        ],
        default: 'get',
    },
    {
        ...dataSourceLocator,
        displayOptions: {
            show: {
                resource: ['dataSource'],
                operation: ['get'],
            },
        },
        description: 'The Notion data source to retrieve',
    },
    {
        displayName: 'Search Text',
        name: 'text',
        type: 'string',
        default: '',
        displayOptions: {
            show: {
                resource: ['dataSource'],
                operation: ['search'],
            },
        },
        description: 'Text to search databases/data sources for',
    },
    ...returnAllOrLimit('dataSource', 'search'),
    simplify('dataSource', ['get', 'search']),
    searchOptions('dataSource', 'search'),
];
export async function get(items) {
    const returnData = [];
    for (let i = 0; i < items.length; i++) {
        try {
            const selectedDataSourceId = this.getNodeParameter('dataSourceId', i, '', {
                extractValue: true,
            });
            const dataSourceId = extractResourceId(selectedDataSourceId);
            let response = await notionApiRequestV3.call(this, 'GET', `/data_sources/${dataSourceId}`);
            if (this.getNodeParameter('simple', i))
                response = simplifyObjects(response, false, 3);
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(response), { itemData: { item: i } });
            returnData.push.apply(returnData, executionData);
        }
        catch (error) {
            handleOperationError.call(this, returnData, error, i);
        }
    }
    return returnData;
}
export async function search(items) {
    const returnData = [];
    for (let i = 0; i < items.length; i++) {
        try {
            const text = this.getNodeParameter('text', i);
            const returnAll = this.getNodeParameter('returnAll', i);
            const body = { filter: { property: 'object', value: 'data_source' } };
            if (text)
                body.query = text;
            const sort = getSearchSort.call(this, i);
            if (sort)
                body.sort = sort;
            const limit = returnAll ? undefined : this.getNodeParameter('limit', i);
            if (limit)
                body.page_size = Math.min(limit, 100);
            const response = await notionApiRequestAllItemsV3.call(this, 'results', 'POST', '/search', body, limit ? { limit } : {});
            let dataSources = flattenDataSources(response);
            if (this.getNodeParameter('simple', i)) {
                dataSources = simplifyObjects(dataSources, false, 3);
            }
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(dataSources), { itemData: { item: i } });
            returnData.push.apply(returnData, executionData);
        }
        catch (error) {
            handleOperationError.call(this, returnData, error, i);
        }
    }
    return returnData;
}
//# sourceMappingURL=DataSource.resource.js.map