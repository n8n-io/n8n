import { microsoftSharePointApiRequest } from '../transport';
const unsupportedFields = ['geoLocation', 'location', 'term', 'url'];
const fieldTypeMapping = {
    string: ['text', 'user', 'lookup'],
    // unknownFutureValue: rating
    number: ['number', 'currency', 'unknownFutureValue'],
    boolean: ['boolean'],
    dateTime: ['dateTime'],
    object: ['thumbnail'],
    options: ['choice'],
};
function mapType(column) {
    if (unsupportedFields.includes(column.type)) {
        return undefined;
    }
    let mappedType = 'string';
    for (const t of Object.keys(fieldTypeMapping)) {
        const postgresTypes = fieldTypeMapping[t];
        if (postgresTypes?.includes(column.type)) {
            mappedType = t;
        }
    }
    return mappedType;
}
export async function getMappingColumns() {
    const site = this.getNodeParameter('site', undefined, { extractValue: true });
    const list = this.getNodeParameter('list', undefined, { extractValue: true });
    const operation = this.getNodeParameter('operation');
    const response = await microsoftSharePointApiRequest.call(this, 'GET', `/sites/${site}/lists/${list}/contentTypes`, {}, { expand: 'columns' });
    const columns = response.value[0].columns;
    const fields = [];
    for (const column of columns.filter((x) => !x.hidden && !x.readOnly)) {
        const fieldType = mapType(column);
        const field = {
            id: column.name,
            canBeUsedToMatch: column.enforceUniqueValues && column.required,
            defaultMatch: false,
            display: true,
            displayName: column.displayName,
            readOnly: column.readOnly || !fieldType,
            required: column.required,
            type: fieldType,
        };
        if (field.type === 'options') {
            field.options = [];
            if (Array.isArray(column.choice?.choices)) {
                for (const choice of column.choice.choices) {
                    field.options.push({
                        name: choice,
                        value: choice,
                    });
                }
            }
        }
        fields.push(field);
    }
    if (operation === 'update') {
        fields.push({
            id: 'id',
            canBeUsedToMatch: true,
            defaultMatch: false,
            display: true,
            displayName: 'ID',
            readOnly: true,
            required: true,
            type: 'string',
        });
    }
    return { fields };
}
//# sourceMappingURL=resourceMapping.js.map