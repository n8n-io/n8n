import { capitalCase } from 'change-case';
import { odooApiRequest } from '../transport';
export async function getContactFields() {
    return await getModelFields.call(this, 'res.partner');
}
export async function getOpportunityFields() {
    return await getModelFields.call(this, 'crm.lead');
}
export async function getActivityFields() {
    return await getModelFields.call(this, 'mail.activity');
}
// ─── Internal helper ──────────────────────────────────────────────────────────
async function getModelFields(model) {
    const response = (await odooApiRequest.call(this, model, 'fields_get', {
        attributes: ['string', 'type', 'required'],
    }));
    return Object.entries(response)
        .map(([key, field]) => {
        let displayName = field.string;
        try {
            displayName = capitalCase(field.string);
        }
        catch { }
        return {
            name: displayName,
            value: key,
            // nodelinter-ignore-next-line
            description: `name: ${key}, type: ${field.type}, required: ${field.required}`,
        };
    })
        .sort((a, b) => a.name.localeCompare(b.name));
}
//# sourceMappingURL=loadOptions.js.map