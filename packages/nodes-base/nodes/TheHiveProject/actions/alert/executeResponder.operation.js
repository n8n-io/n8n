import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { alertRLC, responderOptions } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';
const properties = [{ ...alertRLC, name: 'id' }, responderOptions];
const displayOptions = {
    show: {
        resource: ['alert'],
        operation: ['executeResponder'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    let responseData = [];
    const alertId = this.getNodeParameter('id', i, '', { extractValue: true });
    const responderId = this.getNodeParameter('responder', i);
    let body;
    let response;
    responseData = [];
    body = {
        responderId,
        objectId: alertId,
        objectType: 'alert',
    };
    response = await theHiveApiRequest.call(this, 'POST', '/connector/cortex/action', body);
    body = {
        query: [
            {
                _name: 'listAction',
            },
            {
                _name: 'filter',
                _and: [
                    {
                        _field: 'cortexId',
                        _value: response.cortexId,
                    },
                    {
                        _field: 'objectId',
                        _value: response.objectId,
                    },
                    {
                        _field: 'startDate',
                        _value: response.startDate,
                    },
                ],
            },
        ],
    };
    const qs = {};
    qs.name = 'log-actions';
    do {
        response = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);
    } while (response.status === 'Waiting' || response.status === 'InProgress');
    responseData = response;
    const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=executeResponder.operation.js.map