import { odooApiRequest } from '../transport';
// Field types that are never writable in Odoo (computed relational sets)
const READ_ONLY_TYPES = new Set(['one2many', 'many2many']);
function mapOdooType(odooType) {
    switch (odooType) {
        case 'char':
        case 'text':
        case 'html':
        case 'many2one':
        case 'reference':
        case 'binary':
            return 'string';
        case 'integer':
        case 'float':
        case 'monetary':
            return 'number';
        case 'boolean':
            return 'boolean';
        case 'date':
        case 'datetime':
            return 'dateTime';
        case 'selection':
            return 'options';
        case 'many2many':
        case 'one2many':
            return 'array';
        default:
            return 'string';
    }
}
async function getModelRMCFields(model, requiredFields = new Set()) {
    const schema = (await odooApiRequest.call(this, model, 'fields_get', {
        attributes: ['string', 'type', 'required', 'readonly', 'selection'],
    }));
    const operation = this.getNodeParameter('operation');
    const isCreate = operation === 'create';
    const fields = Object.entries(schema)
        .map(([key, field]) => {
        const type = mapOdooType(field.type);
        const entry = {
            id: key,
            displayName: field.string,
            required: isCreate && requiredFields.has(key),
            defaultMatch: false,
            canBeUsedToMatch: true,
            display: !field.readonly && !READ_ONLY_TYPES.has(field.type),
            removed: true,
            type,
        };
        if (field.type === 'selection' && Array.isArray(field.selection)) {
            entry.options = field.selection.map(([value, label]) => ({
                name: label,
                value,
            }));
        }
        return entry;
    })
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
    return { fields };
}
export async function getOdooFields() {
    const model = this.getNodeParameter('customResource', undefined, {
        extractValue: true,
    });
    if (!model)
        return { fields: [] };
    return await getModelRMCFields.call(this, model);
}
export async function getContactFields() {
    return await getModelRMCFields.call(this, 'res.partner', new Set(['name']));
}
export async function getOpportunityFields() {
    return await getModelRMCFields.call(this, 'crm.lead', new Set(['name']));
}
export async function getActivityFields() {
    return await getModelRMCFields.call(this, 'mail.activity');
}
//# sourceMappingURL=resourceMapping.js.map