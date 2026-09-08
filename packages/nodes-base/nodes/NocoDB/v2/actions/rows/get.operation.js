import { NodeApiError, updateDisplayOptions } from 'n8n-workflow';
import { apiRequest, downloadRecordAttachments } from '../../transport';
export const description = updateDisplayOptions({
    show: {
        operation: ['get'],
    },
}, [
    {
        displayName: 'Row ID Value',
        name: 'id',
        type: 'string',
        default: '',
        required: true,
        description: 'The value of the ID field',
    },
    {
        displayName: 'Download Attachments',
        name: 'downloadAttachments',
        type: 'boolean',
        default: false,
        description: "Whether the attachment fields defined in 'Download Fields' will be downloaded",
    },
    {
        displayName: 'Download Field Names or IDs',
        name: 'downloadFieldNames',
        type: 'multiOptions',
        typeOptions: {
            loadOptionsMethod: 'getDownloadFields',
        },
        required: true,
        displayOptions: {
            show: {
                downloadAttachments: [true],
            },
        },
        default: [],
        description: 'Names of the fields of type \'attachment\' that should be downloaded. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
    },
]);
export async function execute() {
    const items = this.getInputData();
    const returnData = [];
    let responseData;
    let requestMethod;
    let endPoint = '';
    const qs = {};
    const baseId = this.getNodeParameter('projectId', 0, undefined, {
        extractValue: true,
    });
    const table = this.getNodeParameter('table', 0, undefined, {
        extractValue: true,
    });
    for (let i = 0; i < items.length; i++) {
        try {
            requestMethod = 'GET';
            const id = this.getNodeParameter('id', i);
            endPoint = `/api/v3/data/${baseId}/${table}/records/${id}`;
            responseData = await apiRequest.call(this, requestMethod, endPoint, {}, qs);
            const downloadAttachments = this.getNodeParameter('downloadAttachments', i);
            if (downloadAttachments) {
                const downloadFieldNames = this.getNodeParameter('downloadFieldNames', i);
                const data = await downloadRecordAttachments.call(this, [responseData], downloadFieldNames, [{ item: i }]);
                const newItem = {
                    binary: data[0].binary,
                    json: responseData,
                };
                const executionData = this.helpers.constructExecutionMetaData([newItem], { itemData: { item: i } });
                returnData.push.apply(returnData, executionData);
            }
            else {
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push.apply(returnData, executionData);
            }
        }
        catch (error) {
            if (this.continueOnFail()) {
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.toString() }), { itemData: { item: i } });
                returnData.push.apply(returnData, executionData);
            }
            else {
                throw new NodeApiError(this.getNode(), error);
            }
        }
    }
    return [returnData];
}
//# sourceMappingURL=get.operation.js.map