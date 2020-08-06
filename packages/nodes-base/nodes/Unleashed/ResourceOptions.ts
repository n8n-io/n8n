import { INodeProperties } from 'n8n-workflow';

export const stackOnHandOptions = [
    // ----------------------------------
    //         Stack on hands single item options
    // ----------------------------------
    {
        displayName: 'Item',
        name: 'item',
        type: 'string',
        default: '',
        displayOptions: {
            show: {
                resource: [
                    'stockOnHandItem',
                ],
            },
        },
        required: true,
        placeholder: "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
        description: "product GUID"
    },
] as INodeProperties[];



///https://apidocs.unleashedsoftware.com/Pagination
export const paginationOptions = [
    // ----------------------------------
    // General pagination options
    // ----------------------------------
    {
        displayName: 'Get all pages',
        name: 'getAllPages',
        type: 'boolean',
        default: true,
        displayOptions: {
            show: {
                resource: [
                    'stockOnHand',
                    'salesOrders',
                ],
            },
        },
        description: "Pull all available pages"
    },
    {
        displayName: 'Page number',
        name: 'pageNumber',
        type: 'number',
        default: 1,
        typeOptions: {
            minValue: 1,
            maxValue: 10000,
        },
        displayOptions: {
            show: {
                resource: [
                    'stockOnHand',
                    'salesOrders',
                ],
                getAllPages: [
                    false
                ]
            },
        },
        description: "Page number starting with 1"
    },
    {
        displayName: 'Items per page',
        name: 'pageSize',
        type: 'number',
        default: 200,
        typeOptions: {
            minValue: 1,
            maxValue: 1000,
        },
        displayOptions: {
            show: {
                resource: [
                    'stockOnHand',
                    'salesOrders',
                ],
                getAllPages: [
                    false
                ]
            },
        },
        description: "Items per page"
    },
] as INodeProperties[];


