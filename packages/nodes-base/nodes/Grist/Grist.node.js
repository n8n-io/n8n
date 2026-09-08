import { NodeConnectionTypes, } from 'n8n-workflow';
import { generatePairedItemData } from '@utils/utilities';
import { gristApiRequest, gristBaseUrl, parseAutoMappedInputs, parseDefinedFields, parseFilterProperties, parseSortProperties, throwOnZeroDefinedFields, } from './GenericFunctions';
import { operationFields } from './OperationDescription';
export class Grist {
    description = {
        displayName: 'Grist',
        name: 'grist',
        icon: 'file:grist.svg',
        subtitle: '={{$parameter["operation"]}}',
        group: ['input'],
        version: 1,
        description: 'Consume the Grist API',
        defaults: {
            name: 'Grist',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'gristApi',
                required: true,
                testedBy: 'gristApiTest',
            },
        ],
        properties: operationFields,
    };
    methods = {
        loadOptions: {
            async getTableColumns() {
                const docId = this.getNodeParameter('docId', 0);
                const tableId = this.getNodeParameter('tableId', 0);
                const endpoint = `/docs/${docId}/tables/${tableId}/columns`;
                const { columns } = (await gristApiRequest.call(this, 'GET', endpoint));
                return columns.map(({ id }) => ({ name: id, value: id }));
            },
        },
        credentialTest: {
            async gristApiTest(credential) {
                const credentials = credential.data;
                const options = {
                    headers: {
                        Authorization: `Bearer ${credentials.apiKey}`,
                    },
                    method: 'GET',
                    uri: `${gristBaseUrl(credentials)}/api/orgs`,
                    json: true,
                };
                try {
                    // A valid token can still grant zero accessible orgs (e.g. nothing shared); treat
                    // that as a failing test rather than a misleading success.
                    const orgs = await this.helpers.request(options);
                    if (!Array.isArray(orgs) || orgs.length === 0) {
                        return {
                            status: 'Error',
                            message: 'Connected, but no Grist organizations are accessible to this account.',
                        };
                    }
                    return {
                        status: 'OK',
                        message: 'Authentication successful',
                    };
                }
                catch (error) {
                    return {
                        status: 'Error',
                        message: error.message,
                    };
                }
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        let responseData;
        const returnData = [];
        const operation = this.getNodeParameter('operation', 0);
        if (operation === 'upsert') {
            // ----------------------------------
            //            upsert
            // ----------------------------------
            // https://support.getgrist.com/api/#tag/records/operation/replaceRecords
            try {
                const body = { records: [] };
                // Process all input items and batch them
                for (let i = 0; i < items.length; i++) {
                    const { properties: upsertCriteriaProperties } = this.getNodeParameter('upsertCriteria', i, []);
                    throwOnZeroDefinedFields.call(this, upsertCriteriaProperties);
                    const require = parseDefinedFields(upsertCriteriaProperties);
                    const dataToSend = this.getNodeParameter('dataToSend', 0);
                    let fields = {};
                    if (dataToSend === 'autoMapInputs') {
                        const incomingKeys = Object.keys(items[i].json);
                        const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i);
                        const inputsToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());
                        fields = parseAutoMappedInputs(incomingKeys, inputsToIgnore, items[i].json);
                    }
                    else if (dataToSend === 'defineInNode') {
                        const { properties } = this.getNodeParameter('fieldsToSend', i, []);
                        throwOnZeroDefinedFields.call(this, properties);
                        fields = parseDefinedFields(properties);
                    }
                    body.records.push({ require, fields });
                }
                const docId = this.getNodeParameter('docId', 0);
                const tableId = this.getNodeParameter('tableId', 0);
                const endpoint = `/docs/${docId}/tables/${tableId}/records`;
                const qs = {};
                const onMany = this.getNodeParameter('onMany', 0, 'first');
                if (onMany !== 'first') {
                    qs.onmany = onMany;
                }
                const response = (await gristApiRequest.call(this, 'PUT', endpoint, body, qs));
                for (let i = 0; i < items.length; i++) {
                    // Older Grist versions return null, so fall back to the fields we sent
                    const id = response?.recordIds?.[i]?.[0];
                    returnData.push({
                        json: id === undefined ? { ...body.records[i].fields } : { id, ...body.records[i].fields },
                        pairedItem: { item: i },
                    });
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const itemData = generatePairedItemData(items.length);
                    const executionErrorData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData });
                    returnData.push(...executionErrorData);
                }
                else {
                    throw error;
                }
            }
            return [returnData];
        }
        for (let i = 0; i < items.length; i++) {
            try {
                if (operation === 'create') {
                    // ----------------------------------
                    //             create
                    // ----------------------------------
                    // https://support.getgrist.com/api/#tag/records/paths/~1docs~1{docId}~1tables~1{tableId}~1records/post
                    const body = { records: [] };
                    const dataToSend = this.getNodeParameter('dataToSend', 0);
                    if (dataToSend === 'autoMapInputs') {
                        const incomingKeys = Object.keys(items[i].json);
                        const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i);
                        const inputsToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());
                        const fields = parseAutoMappedInputs(incomingKeys, inputsToIgnore, items[i].json);
                        body.records.push({ fields });
                    }
                    else if (dataToSend === 'defineInNode') {
                        const { properties } = this.getNodeParameter('fieldsToSend', i, []);
                        throwOnZeroDefinedFields.call(this, properties);
                        body.records.push({ fields: parseDefinedFields(properties) });
                    }
                    const docId = this.getNodeParameter('docId', 0);
                    const tableId = this.getNodeParameter('tableId', 0);
                    const endpoint = `/docs/${docId}/tables/${tableId}/records`;
                    responseData = await gristApiRequest.call(this, 'POST', endpoint, body);
                    responseData = {
                        id: responseData.records[0].id,
                        ...body.records[0].fields,
                    };
                }
                else if (operation === 'delete') {
                    // ----------------------------------
                    //            delete
                    // ----------------------------------
                    // https://support.getgrist.com/api/#tag/data/paths/~1docs~1{docId}~1tables~1{tableId}~1data~1delete/post
                    const docId = this.getNodeParameter('docId', 0);
                    const tableId = this.getNodeParameter('tableId', 0);
                    const endpoint = `/docs/${docId}/tables/${tableId}/data/delete`;
                    const rawRowIds = this.getNodeParameter('rowId', i).toString();
                    const body = rawRowIds
                        .split(',')
                        .map((c) => c.trim())
                        .map(Number);
                    await gristApiRequest.call(this, 'POST', endpoint, body);
                    responseData = { success: true };
                }
                else if (operation === 'update') {
                    // ----------------------------------
                    //            update
                    // ----------------------------------
                    // https://support.getgrist.com/api/#tag/records/paths/~1docs~1{docId}~1tables~1{tableId}~1records/patch
                    const body = { records: [] };
                    const rowId = this.getNodeParameter('rowId', i);
                    const dataToSend = this.getNodeParameter('dataToSend', 0);
                    if (dataToSend === 'autoMapInputs') {
                        const incomingKeys = Object.keys(items[i].json);
                        const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i);
                        const inputsToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());
                        const fields = parseAutoMappedInputs(incomingKeys, inputsToIgnore, items[i].json);
                        body.records.push({ id: Number(rowId), fields });
                    }
                    else if (dataToSend === 'defineInNode') {
                        const { properties } = this.getNodeParameter('fieldsToSend', i, []);
                        throwOnZeroDefinedFields.call(this, properties);
                        const fields = parseDefinedFields(properties);
                        body.records.push({ id: Number(rowId), fields });
                    }
                    const docId = this.getNodeParameter('docId', 0);
                    const tableId = this.getNodeParameter('tableId', 0);
                    const endpoint = `/docs/${docId}/tables/${tableId}/records`;
                    await gristApiRequest.call(this, 'PATCH', endpoint, body);
                    responseData = {
                        id: rowId,
                        ...body.records[0].fields,
                    };
                }
                else if (operation === 'getAll') {
                    // ----------------------------------
                    //             getAll
                    // ----------------------------------
                    // https://support.getgrist.com/api/#tag/records
                    const docId = this.getNodeParameter('docId', 0);
                    const tableId = this.getNodeParameter('tableId', 0);
                    const endpoint = `/docs/${docId}/tables/${tableId}/records`;
                    const qs = {};
                    const returnAll = this.getNodeParameter('returnAll', i);
                    if (!returnAll) {
                        qs.limit = this.getNodeParameter('limit', i);
                    }
                    const { sort, filter } = this.getNodeParameter('additionalOptions', i);
                    if (sort?.sortProperties.length) {
                        qs.sort = parseSortProperties(sort.sortProperties);
                    }
                    if (filter?.filterProperties.length) {
                        const parsed = parseFilterProperties(filter.filterProperties);
                        qs.filter = JSON.stringify(parsed);
                    }
                    responseData = await gristApiRequest.call(this, 'GET', endpoint, {}, qs);
                    responseData = responseData.records.map((data) => {
                        return { id: data.id, ...data.fields };
                    });
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
                    returnData.push.apply(returnData, executionData);
                    continue;
                }
                throw error;
            }
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
            returnData.push.apply(returnData, executionData);
        }
        return [returnData];
    }
}
//# sourceMappingURL=Grist.node.js.map