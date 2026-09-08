import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { caseRLC } from '../../descriptions';
import { fixFieldType, prepareInputItem } from '../../helpers/utils';
import { theHiveApiRequest } from '../../transport';
const properties = [
    caseRLC,
    {
        displayName: 'Fields',
        name: 'taskFields',
        type: 'resourceMapper',
        default: {
            mappingMode: 'defineBelow',
            value: null,
        },
        noDataExpression: true,
        required: true,
        typeOptions: {
            resourceMapper: {
                resourceMapperMethod: 'getTaskFields',
                mode: 'add',
                valuesLabel: 'Fields',
            },
        },
    },
];
const displayOptions = {
    show: {
        resource: ['task'],
        operation: ['create'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i, item) {
    let responseData = [];
    let body = {};
    const dataMode = this.getNodeParameter('taskFields.mappingMode', i);
    const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true });
    if (dataMode === 'autoMapInputData') {
        const schema = this.getNodeParameter('taskFields.schema', i);
        body = prepareInputItem(item.json, schema, i);
    }
    if (dataMode === 'defineBelow') {
        const taskFields = this.getNodeParameter('taskFields.value', i, []);
        body = taskFields;
    }
    body = fixFieldType(body);
    responseData = await theHiveApiRequest.call(this, 'POST', `/v1/case/${caseId}/task`, body);
    const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=create.operation.js.map