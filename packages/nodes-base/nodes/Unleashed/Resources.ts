import { INodeProperties } from 'n8n-workflow';

export const unleashedResources = [
    {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        options: [
            {
                name: 'Stock on hand - all',
                value: 'stockOnHand',
            },
            {
                name: 'Stock on hand - specific item',
                value: 'stockOnHandItem',
            },
            {
                name: 'Sales orders',
                value: 'salesOrders',
            },
        ],
        default: 'stockOnHand',
        description: 'The resource to operate on.',
    },	
] as INodeProperties[];