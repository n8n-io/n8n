import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { invoiceNinjaApiRequest, invoiceNinjaApiRequestAllItems } from '../GenericFunctions';

export const execute = async function (this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const length = items.length;
    const qs: IDataObject = {};

    let responseData;

    const resource = this.getNodeParameter('resource', 0);
    const operation = this.getNodeParameter('operation', 0);
    if (resource !== 'system') throw new Error('Invalid Resource Execution Handler');

    for (let i = 0; i < length; i++) {
        //Routes: https://github.com/invoiceninja/invoiceninja/blob/v5-stable/routes/api.php or swagger documentation
        try {
            if (operation === 'refresh') {
                qs.current_company = true;
                qs.updated_at = new Date().getTime() / 1000;
                qs.first_load = true;
                const returnAll = this.getNodeParameter('returnAll', i);
                if (returnAll) {
                    responseData = await invoiceNinjaApiRequestAllItems.call(
                        this,
                        'data',
                        'POST',
                        '/refresh',
                        {},
                        qs,
                    );
                } else {
                    const perPage = this.getNodeParameter('perPage', i) as boolean;
                    if (perPage) qs.per_page = perPage;
                    responseData = await invoiceNinjaApiRequest.call(this, 'POST', `/refresh`, {}, qs);
                    responseData = responseData.data;
                }
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
