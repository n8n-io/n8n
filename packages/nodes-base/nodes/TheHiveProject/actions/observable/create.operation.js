import FormData from 'form-data';
import { NodeOperationError, } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { alertRLC, attachmentsUi, caseRLC } from '../../descriptions';
import { fixFieldType, prepareInputItem } from '../../helpers/utils';
import { theHiveApiRequest } from '../../transport';
const properties = [
    {
        // eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
        displayName: 'Create in',
        name: 'createIn',
        type: 'options',
        options: [
            {
                name: 'Case',
                value: 'case',
            },
            {
                name: 'Alert',
                value: 'alert',
            },
        ],
        default: 'case',
    },
    {
        ...caseRLC,
        name: 'id',
        displayOptions: {
            show: {
                createIn: ['case'],
            },
        },
    },
    {
        ...alertRLC,
        name: 'id',
        displayOptions: {
            show: {
                createIn: ['alert'],
            },
        },
    },
    {
        // eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
        displayName: 'Data Type',
        name: 'dataType',
        type: 'options',
        description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
        required: true,
        default: 'file',
        typeOptions: {
            loadOptionsMethod: 'loadObservableTypes',
        },
    },
    {
        displayName: 'Data',
        name: 'data',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
            hide: {
                dataType: ['file'],
            },
        },
    },
    { ...attachmentsUi, required: true, displayOptions: { show: { dataType: ['file'] } } },
    {
        displayName: 'Fields',
        name: 'observableFields',
        type: 'resourceMapper',
        default: {
            mappingMode: 'defineBelow',
            value: null,
        },
        noDataExpression: true,
        required: true,
        typeOptions: {
            resourceMapper: {
                resourceMapperMethod: 'getObservableFields',
                mode: 'add',
                valuesLabel: 'Fields',
            },
        },
    },
];
const displayOptions = {
    show: {
        resource: ['observable'],
        operation: ['create'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i, item) {
    let responseData = {};
    let body = {};
    const createIn = this.getNodeParameter('createIn', i);
    const id = this.getNodeParameter('id', i, '', { extractValue: true });
    const endpoint = `/v1/${createIn}/${id}/observable`;
    const dataMode = this.getNodeParameter('observableFields.mappingMode', i);
    if (dataMode === 'autoMapInputData') {
        const schema = this.getNodeParameter('observableFields.schema', i);
        body = prepareInputItem(item.json, schema, i);
    }
    if (dataMode === 'defineBelow') {
        const observableFields = this.getNodeParameter('observableFields.value', i, []);
        body = observableFields;
    }
    body = fixFieldType(body);
    const dataType = this.getNodeParameter('dataType', i);
    body.dataType = dataType;
    if (dataType === 'file') {
        const inputDataFields = this.getNodeParameter('attachmentsUi.values', i, []).map((entry) => entry.field.trim());
        const formData = new FormData();
        for (const inputDataField of inputDataFields) {
            const binaryData = this.helpers.assertBinaryData(i, inputDataField);
            const dataBuffer = await this.helpers.getBinaryDataBuffer(i, inputDataField);
            formData.append('attachment', dataBuffer, {
                filename: binaryData.fileName,
                contentType: binaryData.mimeType,
            });
        }
        formData.append('_json', JSON.stringify(body));
        responseData = await theHiveApiRequest.call(this, 'POST', endpoint, undefined, undefined, undefined, {
            Headers: {
                'Content-Type': 'multipart/form-data',
            },
            formData,
        });
    }
    else {
        const data = this.getNodeParameter('data', i);
        body.data = data;
        responseData = await theHiveApiRequest.call(this, 'POST', endpoint, body);
    }
    if (responseData.failure) {
        const message = responseData.failure
            .map((error) => error.message)
            .join(', ');
        throw new NodeOperationError(this.getNode(), message, { itemIndex: i });
    }
    const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=create.operation.js.map