import { IBinaryData, IDataObject, IExecuteFunctions, INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import { invoiceNinjaApiDownloadFile, invoiceNinjaApiRequest, invoiceNinjaApiRequestAllItems, invoiceNinjaApiRequestFormData } from '../GenericFunctions';

export const execute = async function (this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const length = items.length;
    const qs: IDataObject = {};

    let responseData;

    const resource = this.getNodeParameter('resource', 0);
    const operation = this.getNodeParameter('operation', 0);
    if (resource !== 'document') throw new Error('Invalid Resource Execution Handler');

    for (let i = 0; i < length; i++) {
        //Routes: https://github.com/invoiceninja/invoiceninja/blob/v5-stable/routes/api.php or swagger documentation
        try {
            if (operation === 'upload') {
                const uploadRessource = this.getNodeParameter('uploadRessource', i);
                const uploadRessourceId = this.getNodeParameter('uploadRessourceId', i);
                const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
                const customFileName = this.getNodeParameter('customFileName', i);
                if (items[i].binary! === undefined) throw new NodeOperationError(
                    this.getNode(),
                    `binary data not exists on this item.`,
                );
                const binaryData: IBinaryData = items[i].binary![binaryPropertyName]!;
                if (binaryData === undefined) throw new NodeOperationError(
                    this.getNode(),
                    `binary data property "${binaryPropertyName}" does not exists on item.${items[i].binary && Object.keys(items[i].binary || {}).length ? ` Did you mean "${Object.keys(items[i].binary!)[0]}"?` : ''}`,
                );
                const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                responseData = await invoiceNinjaApiRequestFormData.call(
                    this,
                    'POST',
                    `/${uploadRessource}/${uploadRessourceId}/upload?_method=put`,
                    {
                        "documents[]": {
                            value: dataBuffer,
                            options: {
                                filename: customFileName || binaryData.fileName,
                            },
                        },
                    },
                );
                responseData = responseData.data;
            }
            if (operation === 'download') {
                const documentId = this.getNodeParameter('documentId', i);
                responseData = await invoiceNinjaApiRequest.call(
                    this,
                    'GET',
                    `/documents/${documentId}`,
                    {},
                    qs,
                );
                responseData = responseData.data;
                // TODO: awaiting fix from https://github.com/invoiceninja/invoiceninja/issues/8198 - or it have to be downloaded through the following url: https:/subdomain.domain.de/documents/{hash}.{type}
                returnData.push({
                    json: responseData,
                    binary: {
                        data: await this.helpers.prepareBinaryData(
                            (await invoiceNinjaApiDownloadFile.call(
                                this,
                                'GET',
                                `/documents/${responseData.id}/download`,
                            )),
                            responseData.hash,
                        ),
                    },
                });
                continue;
            }
            if (operation === 'getAll') {
                const returnAll = this.getNodeParameter('returnAll', i);
                if (returnAll) {
                    responseData = await invoiceNinjaApiRequestAllItems.call(
                        this,
                        'data',
                        'GET',
                        '/documents',
                        {},
                        qs,
                    );
                } else {
                    const perPage = this.getNodeParameter('perPage', i) as boolean;
                    if (perPage) qs.per_page = perPage;
                    responseData = await invoiceNinjaApiRequest.call(this, 'GET', '/documents', {}, qs);
                    responseData = responseData.data;
                }
            }
            if (operation === 'delete') {
                const documentId = this.getNodeParameter('documentId', i) as string;
                responseData = await invoiceNinjaApiRequest.call(
                    this,
                    'DELETE',
                    `/documents/${documentId}`,
                );
                responseData = responseData.data;
            }

            const executionData = this.helpers.constructExecutionMetaData(
                this.helpers.returnJsonArray(responseData),
                { itemData: { item: i } },
            );

            returnData.push(...executionData);
        } catch (error) {
            if (this.continueOnFail()) {
                const executionErrorData = this.helpers.constructExecutionMetaData(
                    this.helpers.returnJsonArray({ error: error.message }),
                    { itemData: { item: i } },
                );
                returnData.push(...executionErrorData);
                continue;
            }
            throw error;
        }
    }

    return this.prepareOutputData(returnData);
};
