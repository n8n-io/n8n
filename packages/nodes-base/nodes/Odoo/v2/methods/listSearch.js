import { odooApiRequest } from '../transport';
export async function searchModels(filter) {
    const domain = filter ? [['name', 'ilike', filter]] : [];
    const response = (await odooApiRequest.call(this, 'ir.model', 'search_read', {
        domain,
        fields: ['name', 'model'],
        limit: 60,
        offset: 0,
    }));
    return {
        results: response
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((m) => ({
            name: m.name,
            value: m.model,
            description: m.model,
        })),
    };
}
export async function searchCustomRecords(filter) {
    const model = this.getNodeParameter('customResource', undefined, {
        extractValue: true,
    });
    if (!model)
        return { results: [] };
    const domain = filter ? [['display_name', 'ilike', filter]] : [];
    const response = (await odooApiRequest.call(this, model, 'search_read', {
        domain,
        fields: ['id', 'display_name'],
        limit: 60,
        offset: 0,
    }));
    return {
        results: response.map((r) => ({
            name: r.display_name,
            value: r.id,
        })),
    };
}
export async function searchModelRecords(filter) {
    const model = this.getNodeParameter('res_model', undefined, {
        extractValue: true,
    });
    if (!model)
        return { results: [] };
    const domain = filter ? [['display_name', 'ilike', filter]] : [];
    const response = (await odooApiRequest.call(this, model, 'search_read', {
        domain,
        fields: ['id', 'display_name'],
        limit: 60,
        offset: 0,
    }));
    return {
        results: response.map((r) => ({
            name: r.display_name,
            value: r.id,
        })),
    };
}
export async function searchContacts(filter) {
    const domain = filter ? [['name', 'ilike', filter]] : [];
    const response = (await odooApiRequest.call(this, 'res.partner', 'search_read', {
        domain,
        fields: ['id', 'name'],
        limit: 60,
        offset: 0,
    }));
    return {
        results: response.map((r) => ({
            name: r.name,
            value: r.id,
        })),
    };
}
export async function searchOpportunities(filter) {
    const domain = filter ? [['name', 'ilike', filter]] : [];
    const response = (await odooApiRequest.call(this, 'crm.lead', 'search_read', {
        domain,
        fields: ['id', 'name'],
        limit: 60,
        offset: 0,
    }));
    return {
        results: response.map((r) => ({
            name: r.name,
            value: r.id,
        })),
    };
}
export async function searchActivities(filter) {
    const domain = filter ? [['summary', 'ilike', filter]] : [];
    const response = (await odooApiRequest.call(this, 'mail.activity', 'search_read', {
        domain,
        fields: ['id', 'summary', 'res_name'],
        limit: 60,
        offset: 0,
    }));
    return {
        results: response.map((r) => ({
            name: r.summary || `Activity #${r.id}`,
            value: r.id,
            description: r.res_name,
        })),
    };
}
export async function searchActivityTypes(filter) {
    const domain = filter ? [['name', 'ilike', filter]] : [];
    const response = (await odooApiRequest.call(this, 'mail.activity.type', 'search_read', {
        domain,
        fields: ['id', 'name'],
        limit: 60,
        offset: 0,
    }));
    return {
        results: response
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((t) => ({
            name: t.name,
            value: t.id,
        })),
    };
}
export async function searchUsers(filter) {
    const domain = [['active', '=', true]];
    if (filter)
        domain.push(['name', 'ilike', filter]);
    const response = (await odooApiRequest.call(this, 'res.users', 'search_read', {
        domain,
        fields: ['id', 'name'],
        limit: 60,
        offset: 0,
    }));
    return {
        results: response
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((u) => ({
            name: u.name,
            value: u.id,
        })),
    };
}
//# sourceMappingURL=listSearch.js.map