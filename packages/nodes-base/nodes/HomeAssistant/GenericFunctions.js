import { NodeApiError } from 'n8n-workflow';
export async function homeAssistantApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    const credentials = await this.getCredentials('homeAssistantApi');
    let options = {
        headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
        },
        method,
        qs,
        body,
        uri: uri ??
            `${credentials.ssl === true ? 'https' : 'http'}://${credentials.host}:${credentials.port}/api${resource}`,
        json: true,
    };
    options = Object.assign({}, options, option);
    if (Object.keys(options.body).length === 0) {
        delete options.body;
    }
    try {
        if (this.helpers.request) {
            return await this.helpers.request(options);
        }
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function getHomeAssistantEntities(domain = '') {
    const returnData = [];
    const entities = await homeAssistantApiRequest.call(this, 'GET', '/states');
    for (const entity of entities) {
        const entityId = entity.entity_id;
        if (domain === '' || (domain && entityId.startsWith(domain))) {
            const entityName = entity.attributes.friendly_name || entityId;
            returnData.push({
                name: entityName,
                value: entityId,
            });
        }
    }
    return returnData;
}
export async function getHomeAssistantServices(domain = '') {
    const returnData = [];
    const services = await homeAssistantApiRequest.call(this, 'GET', '/services');
    if (domain === '') {
        // If no domain specified return domains
        const domains = services.map(({ domain: service }) => service).sort();
        returnData.push(...domains.map((service) => ({
            name: service,
            value: service,
        })));
        return returnData;
    }
    else {
        // If we have a domain, return all relevant services
        const domainServices = services.filter((service) => service.domain === domain);
        for (const domainService of domainServices) {
            for (const [serviceID, value] of Object.entries(domainService.services)) {
                const serviceProperties = value;
                const serviceName = serviceProperties.description || serviceID;
                returnData.push({
                    name: serviceName,
                    value: serviceID,
                });
            }
        }
    }
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map