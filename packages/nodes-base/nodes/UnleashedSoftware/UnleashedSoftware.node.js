import moment from 'moment-timezone';
import { NodeConnectionTypes, } from 'n8n-workflow';
import { convertNETDates, unleashedApiRequest, unleashedApiRequestAllItems, } from './GenericFunctions';
import { salesOrderFields, salesOrderOperations } from './SalesOrderDescription';
import { stockOnHandFields, stockOnHandOperations } from './StockOnHandDescription';
export class UnleashedSoftware {
    description = {
        displayName: 'Unleashed Software',
        name: 'unleashedSoftware',
        group: ['transform'],
        subtitle: '={{$parameter["operation"] + ":" + $parameter["resource"]}}',
        // eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
        icon: 'file:unleashedSoftware.png',
        version: [1, 1.1],
        description: 'Consume Unleashed Software API',
        defaults: {
            name: 'Unleashed Software',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'unleashedSoftwareApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Sales Order',
                        value: 'salesOrder',
                    },
                    {
                        name: 'Stock On Hand',
                        value: 'stockOnHand',
                    },
                ],
                default: 'salesOrder',
            },
            ...salesOrderOperations,
            ...salesOrderFields,
            ...stockOnHandOperations,
            ...stockOnHandFields,
        ],
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        const qs = {};
        let responseData = [];
        const serializeDates = this.getNode().typeVersion >= 1.1;
        for (let i = 0; i < length; i++) {
            const resource = this.getNodeParameter('resource', 0);
            const operation = this.getNodeParameter('operation', 0);
            //https://apidocs.unleashedsoftware.com/SalesOrders
            if (resource === 'salesOrder') {
                if (operation === 'getAll') {
                    const returnAll = this.getNodeParameter('returnAll', i);
                    const filters = this.getNodeParameter('filters', i);
                    if (filters.startDate) {
                        filters.startDate = moment(filters.startDate).format('YYYY-MM-DD');
                    }
                    if (filters.endDate) {
                        filters.endDate = moment(filters.endDate).format('YYYY-MM-DD');
                    }
                    if (filters.modifiedSince) {
                        filters.modifiedSince = moment(filters.modifiedSince).format('YYYY-MM-DD');
                    }
                    if (filters.orderStatus) {
                        filters.orderStatus = filters.orderStatus.join(',');
                    }
                    Object.assign(qs, filters);
                    if (returnAll) {
                        responseData = await unleashedApiRequestAllItems.call(this, 'Items', 'GET', '/SalesOrders', {}, qs);
                    }
                    else {
                        const limit = this.getNodeParameter('limit', i);
                        qs.pageSize = limit;
                        responseData = (await unleashedApiRequest.call(this, 'GET', '/SalesOrders', {}, qs, 1));
                        responseData = responseData.Items;
                    }
                    convertNETDates(responseData, serializeDates);
                    responseData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                }
            }
            //https://apidocs.unleashedsoftware.com/StockOnHand
            if (resource === 'stockOnHand') {
                if (operation === 'getAll') {
                    const returnAll = this.getNodeParameter('returnAll', i);
                    const filters = this.getNodeParameter('filters', i);
                    if (filters.asAtDate) {
                        filters.asAtDate = moment(filters.asAtDate).format('YYYY-MM-DD');
                    }
                    if (filters.modifiedSince) {
                        filters.modifiedSince = moment(filters.modifiedSince).format('YYYY-MM-DD');
                    }
                    if (filters.orderBy) {
                        filters.orderBy = filters.orderBy.trim();
                    }
                    Object.assign(qs, filters);
                    if (returnAll) {
                        responseData = await unleashedApiRequestAllItems.call(this, 'Items', 'GET', '/StockOnHand', {}, qs);
                    }
                    else {
                        const limit = this.getNodeParameter('limit', i);
                        qs.pageSize = limit;
                        responseData = (await unleashedApiRequest.call(this, 'GET', '/StockOnHand', {}, qs, 1));
                        responseData = responseData.Items;
                    }
                    convertNETDates(responseData, serializeDates);
                    responseData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                }
                if (operation === 'get') {
                    const productId = this.getNodeParameter('productId', i);
                    responseData = await unleashedApiRequest.call(this, 'GET', `/StockOnHand/${productId}`);
                    convertNETDates(responseData, serializeDates);
                }
            }
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
            returnData.push(...executionData);
        }
        return [returnData];
    }
}
//# sourceMappingURL=UnleashedSoftware.node.js.map