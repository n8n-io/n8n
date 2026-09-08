import { DateTime } from 'luxon';
import { jsonParse, NodeOperationError } from 'n8n-workflow';
function getFieldValue(schemaField, field, parseTimestamps = false) {
    if (schemaField.type === 'RECORD') {
        return simplify([field.v], schemaField.fields);
    }
    else {
        let value = field.v;
        if (schemaField.type === 'JSON') {
            try {
                value = jsonParse(value);
            }
            catch (error) { }
        }
        else if (schemaField.type === 'TIMESTAMP' && parseTimestamps) {
            const dt = DateTime.fromSeconds(Number(value));
            value = dt.isValid ? dt.toISO() : value;
        }
        return value;
    }
}
export function wrapData(data) {
    if (!Array.isArray(data)) {
        return [{ json: data }];
    }
    return data.map((item) => ({
        json: item,
    }));
}
export function simplify(data, schema, includeSchema = false, parseTimestamps = false) {
    const returnData = [];
    for (const entry of data) {
        const record = {};
        for (const [index, field] of entry.f.entries()) {
            if (schema[index].mode !== 'REPEATED') {
                record[schema[index].name] = getFieldValue(schema[index], field, parseTimestamps);
            }
            else {
                record[schema[index].name] = field.v.flatMap((repeatedField) => {
                    return getFieldValue(schema[index], repeatedField, parseTimestamps);
                });
            }
        }
        if (includeSchema) {
            record._schema = schema;
        }
        returnData.push(record);
    }
    return returnData;
}
export function prepareOutput(response, itemIndex, rawOutput, includeSchema = false) {
    let responseData;
    if (response === undefined)
        return [];
    if (rawOutput) {
        responseData = response;
    }
    else {
        const { rows, schema } = response;
        const parseTimestamps = this.getNode().typeVersion >= 2.1;
        if (rows !== undefined && schema !== undefined) {
            const fields = schema.fields;
            responseData = rows;
            responseData = simplify(responseData, fields, includeSchema, parseTimestamps);
        }
        else if (schema && includeSchema) {
            responseData = { success: true, _schema: schema };
        }
        else {
            responseData = { success: true };
        }
    }
    const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
        itemData: { item: itemIndex },
    });
    return executionData;
}
export function checkSchema(schema, record, i) {
    const returnData = { ...record };
    schema.fields.forEach(({ name, mode, type, fields }) => {
        if (mode === 'REQUIRED' && returnData[name] === undefined) {
            throw new NodeOperationError(this.getNode(), `The property '${name}' is required, please define it in the 'Fields to Send'`, { itemIndex: i });
        }
        if (type !== 'STRING' && returnData[name] === '') {
            returnData[name] = null;
        }
        if (type === 'JSON') {
            let value = returnData[name];
            if (typeof value === 'object') {
                value = JSON.stringify(value);
            }
            returnData[name] = value;
        }
        if (type === 'RECORD' && typeof returnData[name] !== 'object') {
            let parsedField;
            try {
                parsedField = jsonParse(returnData[name]);
            }
            catch (error) {
                const recordField = fields ? `Field Schema:\n ${JSON.stringify(fields)}` : '';
                throw new NodeOperationError(this.getNode(), `The property '${name}' is a RECORD type, but the value is nor an object nor a valid JSON string`, { itemIndex: i, description: recordField });
            }
            returnData[name] = parsedField;
        }
    });
    return returnData;
}
//# sourceMappingURL=utils.js.map