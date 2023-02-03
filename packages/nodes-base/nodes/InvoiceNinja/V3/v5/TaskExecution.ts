import { IDataObject, IExecuteFunctions, INodeExecutionData } from "n8n-workflow";
import { invoiceNinjaApiRequest, invoiceNinjaApiRequestAllItems } from "../GenericFunctions";
import { ITask } from "./TaskInterface";

export const execute = async function (that: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = that.getInputData();
    const returnData: INodeExecutionData[] = [];
    const length = items.length;
    const qs: IDataObject = {};

    let responseData;

    const resource = that.getNodeParameter('resource', 0);
    const operation = that.getNodeParameter('operation', 0);
    if (resource !== 'task') throw new Error('Invalid Resource Execution Handler');

    for (let i = 0; i < length; i++) {
        //Routes: https://github.com/invoiceninja/invoiceninja/blob/v5-stable/routes/api.php or swagger documentation
        try {

            if (operation === 'create') {
                const additionalFields = that.getNodeParameter('additionalFields', i);
                const body: ITask = {};
                if (additionalFields.client) {
                    body.client_id = additionalFields.client as string;
                }
                if (additionalFields.project) {
                    body.project_id = additionalFields.project as string;
                }
                if (additionalFields.description) {
                    body.description = additionalFields.description as string;
                }
                if (additionalFields.customValue1) {
                    body.custom_value1 = additionalFields.customValue1 as string;
                }
                if (additionalFields.customValue2) {
                    body.custom_value2 = additionalFields.customValue2 as string;
                }
                if (additionalFields.customValue3) {
                    body.custom_value3 = additionalFields.customValue3 as string;
                }
                if (additionalFields.customValue4) {
                    body.custom_value4 = additionalFields.customValue4 as string;
                }
                const timeLogsValues = (that.getNodeParameter('timeLogsUi', i) as IDataObject)
                    .timeLogsValues as IDataObject[];
                if (timeLogsValues) {
                    const logs: number[][] = [];
                    for (const logValue of timeLogsValues) {
                        let from = 0,
                            to;
                        if (logValue.startDate) {
                            from = new Date(logValue.startDate as string).getTime() / 1000;
                        }
                        if (logValue.endDate) {
                            to = new Date(logValue.endDate as string).getTime() / 1000;
                        }
                        if (logValue.duration) {
                            to = from + (logValue.duration as number) * 3600;
                        }
                        logs.push([from, to as number]);
                    }
                    body.time_log = JSON.stringify(logs);
                }
                responseData = await invoiceNinjaApiRequest.call(
                    that,
                    'POST',
                    '/tasks',
                    body as IDataObject,
                );
                responseData = responseData.data;
            }
            if (operation === 'update') {
                const taskId = that.getNodeParameter('taskId', i) as string;
                const additionalFields = that.getNodeParameter('additionalFields', i);
                const body: ITask = {};
                if (additionalFields.client) {
                    body.client_id = additionalFields.client as string;
                }
                if (additionalFields.project) {
                    body.project_id = additionalFields.project as string;
                }
                if (additionalFields.description) {
                    body.description = additionalFields.description as string;
                }
                if (additionalFields.customValue1) {
                    body.custom_value1 = additionalFields.customValue1 as string;
                }
                if (additionalFields.customValue2) {
                    body.custom_value2 = additionalFields.customValue2 as string;
                }
                if (additionalFields.customValue3) {
                    body.custom_value3 = additionalFields.customValue3 as string;
                }
                if (additionalFields.customValue4) {
                    body.custom_value4 = additionalFields.customValue4 as string;
                }
                const timeLogsValues = (that.getNodeParameter('timeLogsUi', i) as IDataObject)
                    .timeLogsValues as IDataObject[];
                if (timeLogsValues) {
                    const logs: number[][] = [];
                    for (const logValue of timeLogsValues) {
                        let from = 0,
                            to;
                        if (logValue.startDate) {
                            from = new Date(logValue.startDate as string).getTime() / 1000;
                        }
                        if (logValue.endDate) {
                            to = new Date(logValue.endDate as string).getTime() / 1000;
                        }
                        if (logValue.duration) {
                            to = from + (logValue.duration as number) * 3600;
                        }
                        logs.push([from, to as number]);
                    }
                    body.time_log = JSON.stringify(logs);
                }
                responseData = await invoiceNinjaApiRequest.call(
                    that,
                    'PUT',
                    `/tasks/${taskId}`,
                    body as IDataObject,
                );
                responseData = responseData.data;
            }
            if (operation === 'get') {
                const taskId = that.getNodeParameter('taskId', i) as string;
                const include = that.getNodeParameter('include', i) as Array<string>;
                if (include.length) {
                    qs.include = include.toString() as string;
                }
                responseData = await invoiceNinjaApiRequest.call(
                    that,
                    'GET',
                    `/tasks/${taskId}`,
                    {},
                    qs,
                );
                responseData = responseData.data;
            }
            if (operation === 'getAll') {
                const filters = that.getNodeParameter('filters', i);
                if (filters.filter) {
                    qs.filter = filters.filter as string;
                }
                if (filters.number) {
                    qs.number = filters.number as string;
                }
                const include = that.getNodeParameter('include', i) as Array<string>;
                if (include.length) {
                    qs.include = include.toString() as string;
                }
                const returnAll = that.getNodeParameter('returnAll', i) as boolean;
                if (returnAll) {
                    responseData = await invoiceNinjaApiRequestAllItems.call(
                        that,
                        'data',
                        'GET',
                        '/tasks',
                        {},
                        qs,
                    );
                } else {
                    const perPage = that.getNodeParameter('perPage', i) as boolean;
                    if (perPage) qs.per_page = perPage;
                    responseData = await invoiceNinjaApiRequest.call(that, 'GET', '/tasks', {}, qs);
                    responseData = responseData.data;
                }
            }
            if (operation === 'delete') {
                const taskId = that.getNodeParameter('taskId', i) as string;
                responseData = await invoiceNinjaApiRequest.call(that, 'DELETE', `/tasks/${taskId}`);
                responseData = responseData.data;
            }

            const executionData = that.helpers.constructExecutionMetaData(
                that.helpers.returnJsonArray(responseData),
                { itemData: { item: i } },
            );

            returnData.push(...executionData);
        } catch (error) {
            if (that.continueOnFail()) {
                const executionErrorData = that.helpers.constructExecutionMetaData(
                    that.helpers.returnJsonArray({ error: error.message }),
                    { itemData: { item: i } },
                );
                returnData.push(...executionErrorData);
                continue;
            }
            throw error;
        }
    }

    return that.prepareOutputData(returnData);
}