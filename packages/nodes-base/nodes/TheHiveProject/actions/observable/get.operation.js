import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { observableRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';
const properties = [observableRLC];
const displayOptions = {
    show: {
        resource: ['observable'],
        operation: ['get'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    let responseData = [];
    const observableId = this.getNodeParameter('observableId', i, '', {
        extractValue: true,
    });
    const qs = {};
    const body = {
        query: [
            {
                _name: 'getObservable',
                idOrName: observableId,
            },
        ],
    };
    qs.name = `get-observable-${observableId}`;
    responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);
    const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=get.operation.js.map