import set from 'lodash/set';
import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { fixFieldType, prepareInputItem } from '../../helpers/utils';
import { theHiveApiRequest } from '../../transport';
const properties = [
    {
        displayName: 'Fields',
        name: 'caseFields',
        type: 'resourceMapper',
        default: {
            mappingMode: 'defineBelow',
            value: null,
        },
        noDataExpression: true,
        required: true,
        typeOptions: {
            resourceMapper: {
                resourceMapperMethod: 'getCaseFields',
                mode: 'add',
                valuesLabel: 'Fields',
            },
        },
    },
];
const displayOptions = {
    show: {
        resource: ['case'],
        operation: ['create'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i, item) {
    let responseData = [];
    let inputData = {};
    const dataMode = this.getNodeParameter('caseFields.mappingMode', i);
    if (dataMode === 'autoMapInputData') {
        const schema = this.getNodeParameter('caseFields.schema', i);
        inputData = prepareInputItem(item.json, schema, i);
    }
    if (dataMode === 'defineBelow') {
        const caseFields = this.getNodeParameter('caseFields.value', i, []);
        inputData = caseFields;
    }
    inputData = fixFieldType(inputData);
    const body = {};
    for (const field of Object.keys(inputData)) {
        // use set to construct the updateBody, as it allows to process customFields.fieldName
        // if customFields provided under customFields property, it will be send as is
        set(body, field, inputData[field]);
    }
    responseData = await theHiveApiRequest.call(this, 'POST', '/v1/case', body);
    const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=create.operation.js.map