import { updateDisplayOptions } from 'n8n-workflow';
import { itemRLC, listRLC, siteRLC, untilListSelected, untilSiteSelected, } from '../common.descriptions';
const properties = [
    {
        ...siteRLC,
        description: 'Select the site to retrieve lists from',
    },
    {
        ...listRLC,
        description: 'Select the list you want to retrieve an item from',
        displayOptions: {
            hide: {
                ...untilSiteSelected,
            },
        },
    },
    {
        ...itemRLC,
        description: 'Select the item you want to get',
        displayOptions: {
            hide: {
                ...untilSiteSelected,
                ...untilListSelected,
            },
        },
    },
    {
        displayName: 'Simplify',
        name: 'simplify',
        default: true,
        routing: {
            send: {
                preSend: [
                    async function (requestOptions) {
                        const simplify = this.getNodeParameter('simplify', false);
                        if (simplify) {
                            requestOptions.qs ??= {};
                            requestOptions.qs.$select = 'id,createdDateTime,lastModifiedDateTime,webUrl';
                            requestOptions.qs.$expand = 'fields(select=Title)';
                        }
                        return requestOptions;
                    },
                ],
            },
        },
        type: 'boolean',
    },
];
const displayOptions = {
    show: {
        resource: ['item'],
        operation: ['get'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
//# sourceMappingURL=get.operation.js.map