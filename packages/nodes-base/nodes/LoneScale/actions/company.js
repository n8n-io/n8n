import { NodeOperationError } from 'n8n-workflow';
import { lonescaleApiRequest } from '../GenericFunctions';
export async function search(i) {
    const domain = this.getNodeParameter('searchDomain', i);
    const linkedinId = this.getNodeParameter('searchLinkedinId', i);
    const slug = this.getNodeParameter('searchSlug', i);
    const name = this.getNodeParameter('searchName', i);
    const enrich = this.getNodeParameter('searchEnrich', i);
    if (!domain && !linkedinId && !slug && !name) {
        throw new NodeOperationError(this.getNode(), 'Provide at least one company identifier: domain, Linkedin ID, slug or name', { itemIndex: i });
    }
    const qs = {
        ...(domain && { domain }),
        ...(linkedinId && { linkedin_id: linkedinId }),
        ...(slug && { slug }),
        ...(name && { name }),
        ...(enrich && { enrich: true }),
    };
    const responseData = await lonescaleApiRequest.call(this, 'GET', '/companies/search', {}, qs);
    const results = responseData.results ?? [];
    return this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(results), {
        itemData: { item: i },
    });
}
//# sourceMappingURL=company.js.map