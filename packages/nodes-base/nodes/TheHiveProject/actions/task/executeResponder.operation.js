import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { responderOptions, taskRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';
const properties = [{ ...taskRLC, name: 'id' }, responderOptions];
const displayOptions = {
    show: {
        resource: ['task'],
        operation: ['executeResponder'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    let responseData = [];
    const taskId = this.getNodeParameter('id', i);
    const responderId = this.getNodeParameter('responder', i);
    let body;
    let response;
    responseData = [];
    const qs = {};
    body = {
        responderId,
        objectId: taskId,
        objectType: 'case_task',
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
    qs.name = 'task-actions';
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