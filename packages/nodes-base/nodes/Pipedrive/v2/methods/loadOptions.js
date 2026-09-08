import { pipedriveApiRequest, sortOptionParameters } from '../transport';
/**
 * Get all activity types
 * Uses v1 endpoint: /activityTypes
 */
export async function getActivityTypes() {
    const returnData = [];
    const { data } = await pipedriveApiRequest.call(this, 'GET', '/activityTypes', {}, {}, { apiVersion: 'v1' });
    for (const activity of data) {
        returnData.push({
            name: activity.name,
            value: activity.key_string,
        });
    }
    return sortOptionParameters(returnData);
}
/**
 * Get all filters for a resource
 * Uses v1 endpoint: /filters
 */
export async function getFilters() {
    const returnData = [];
    const resource = this.getNodeParameter('resource');
    const type = {
        deal: 'deals',
        activity: 'activity',
        person: 'people',
        organization: 'org',
    };
    const { data } = await pipedriveApiRequest.call(this, 'GET', '/filters', {}, { type: type[resource] }, { apiVersion: 'v1' });
    for (const filter of data) {
        returnData.push({
            name: filter.name,
            value: filter.id,
        });
    }
    return sortOptionParameters(returnData);
}
/**
 * Get all organizations
 * Uses v2 endpoint: /organizations
 */
export async function getOrganizationIds() {
    const returnData = [];
    const { data } = await pipedriveApiRequest.call(this, 'GET', '/organizations', {});
    for (const org of data) {
        returnData.push({
            name: org.name,
            value: org.id,
        });
    }
    return sortOptionParameters(returnData);
}
/**
 * Get all users (active only)
 * Uses v1 endpoint: /users
 */
export async function getUserIds() {
    const returnData = [];
    const resource = this.getCurrentNodeParameter('resource');
    const { data } = await pipedriveApiRequest.call(this, 'GET', '/users', {}, {}, { apiVersion: 'v1' });
    for (const user of data) {
        if (user.active_flag) {
            returnData.push({
                name: user.name,
                value: user.id,
            });
        }
    }
    if (resource === 'activity') {
        returnData.push({
            name: 'All Users',
            value: 0,
        });
    }
    return sortOptionParameters(returnData);
}
/**
 * Get all deals
 * Uses v2 endpoint: /deals
 */
export async function getDeals() {
    const { data } = await pipedriveApiRequest.call(this, 'GET', '/deals', {});
    const deals = data;
    return sortOptionParameters(deals.map(({ id, title }) => ({ value: id, name: title })));
}
/**
 * Get all products
 * Uses v2 endpoint: /products
 */
export async function getProducts() {
    const { data } = await pipedriveApiRequest.call(this, 'GET', '/products', {});
    const products = data;
    return sortOptionParameters(products.map(({ id, name }) => ({ value: id, name })));
}
/**
 * Get all products of a deal
 * Uses v2 endpoint: /deals/{id}/products
 */
export async function getProductsDeal() {
    const dealId = this.getCurrentNodeParameter('dealId');
    const { data } = await pipedriveApiRequest.call(this, 'GET', `/deals/${dealId}/products`, {});
    const products = data;
    return sortOptionParameters(products.map(({ id, name }) => ({ value: id, name })));
}
/**
 * Get all stages
 * Uses v2 endpoint: /stages
 */
export async function getStageIds() {
    const returnData = [];
    const { data } = await pipedriveApiRequest.call(this, 'GET', '/stages', {});
    for (const stage of data) {
        returnData.push({
            name: `${stage.pipeline_name} > ${stage.name}`,
            value: stage.id,
        });
    }
    return sortOptionParameters(returnData);
}
async function getLabelsForResource(endpoint) {
    const returnData = [];
    const { data } = await pipedriveApiRequest.call(this, 'GET', endpoint, {});
    for (const field of data) {
        const fieldCode = field.field_code ?? field.key;
        if ((fieldCode === 'label' || fieldCode === 'label_ids') && field.options) {
            for (const option of field.options) {
                returnData.push({
                    name: option.label,
                    value: option.id,
                });
            }
        }
    }
    return sortOptionParameters(returnData);
}
export async function getPersonLabels() {
    return await getLabelsForResource.call(this, '/personFields');
}
export async function getOrganizationLabels() {
    return await getLabelsForResource.call(this, '/organizationFields');
}
/**
 * Get all persons
 * Uses v2 endpoint: /persons
 */
export async function getPersons() {
    const { data } = await pipedriveApiRequest.call(this, 'GET', '/persons', {});
    const persons = data;
    return sortOptionParameters(persons.map(({ id, name }) => ({ value: id, name })));
}
/**
 * Get all lead labels
 * Uses v1 endpoint: /leadLabels
 */
export async function getLeadLabels() {
    const { data } = await pipedriveApiRequest.call(this, 'GET', '/leadLabels', {}, {}, { apiVersion: 'v1' });
    const labels = data;
    return sortOptionParameters(labels.map(({ id, name }) => ({ value: id, name })));
}
export async function getDealLabels() {
    return await getLabelsForResource.call(this, '/dealFields');
}
//# sourceMappingURL=loadOptions.js.map