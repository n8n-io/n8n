import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { logRLC, responderOptions } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';
const properties = [{ ...logRLC, name: 'id' }, responderOptions];
const displayOptions = {
    show: {
        resource: ['log'],
        operation: ['executeResponder'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    let responseData = [];
    const logId = this.getNodeParameter('id', i);
    const responderId = this.getNodeParameter('responder', i);
    let body;
    let response;
    const qs = {};
    body = {
        responderId,
        objectId: logId,
        objectType: 'case_task_log',
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