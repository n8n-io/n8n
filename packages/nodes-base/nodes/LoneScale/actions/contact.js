import { NodeOperationError } from 'n8n-workflow';
import { lonescaleApiRequest } from '../GenericFunctions';
export async function enrich(i) {
    const enrichmentType = this.getNodeParameter('enrichmentType', i);
    const firstName = this.getNodeParameter('firstName', i);
    const lastName = this.getNodeParameter('lastName', i);
    const companyName = this.getNodeParameter('enrichCompanyName', i);
    const companyDomain = this.getNodeParameter('enrichCompanyDomain', i);
    const detectJobChange = this.getNodeParameter('detectJobChange', i);
    const additionalFields = this.getNodeParameter('enrichAdditionalFields', i);
    const contact = {
        firstname: firstName,
        lastname: lastName,
        ...(companyName && { company_name: companyName }),
        ...(companyDomain && { domain: companyDomain }),
        ...(additionalFields.email && { email: additionalFields.email }),
        ...(additionalFields.jobTitle && { job_title: additionalFields.jobTitle }),
        ...(additionalFields.linkedinUrl && { linkedin_url: additionalFields.linkedinUrl }),
        ...(additionalFields.contactId && {
            custom: { contact_id: additionalFields.contactId },
        }),
    };
    const body = {
        enrichment_type: enrichmentType,
        contacts: [contact],
        ...(detectJobChange && { detect_job_change: true }),
    };
    const responseData = await lonescaleApiRequest.call(this, 'POST', '/trigger/enrich/sync', body);
    const contacts = responseData.contacts ?? [];
    return this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(contacts), {
        itemData: { item: i },
    });
}
export async function source(i) {
    const companyDomain = this.getNodeParameter('sourceCompanyDomain', i);
    const companyName = this.getNodeParameter('sourceCompanyName', i);
    const companyLinkedinUrl = this.getNodeParameter('sourceCompanyLinkedinUrl', i);
    if (!companyDomain && !companyName && !companyLinkedinUrl) {
        throw new NodeOperationError(this.getNode(), 'Provide at least one company identifier: domain, name or Linkedin URL', { itemIndex: i });
    }
    const additionalFields = this.getNodeParameter('sourceAdditionalFields', i);
    const rawPersonas = this.getNodeParameter('personas', i, {}).persona ?? [];
    const toList = (value) => (value || '')
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
    const personas = rawPersonas.map((p) => ({
        name: p.name,
        job_titles: toList(p.jobTitles),
        ...(toList(p.excludeJobTitles).length && {
            exclude_job_titles: toList(p.excludeJobTitles),
        }),
    }));
    const includedLocations = toList(additionalFields.includedLocations ?? '');
    const body = {
        ...(companyDomain && { company_domain: companyDomain }),
        ...(companyName && { company_name: companyName }),
        ...(companyLinkedinUrl && { company_linkedin_url: companyLinkedinUrl }),
        personas,
        ...(additionalFields.maxResults && { limit: additionalFields.maxResults }),
        ...(includedLocations.length && { included_locations: includedLocations }),
        ...(additionalFields.seniorityLevels?.length && {
            seniority_levels: additionalFields.seniorityLevels,
        }),
        ...(additionalFields.disableCompanyInfo && { disable_company_info: true }),
    };
    const responseData = await lonescaleApiRequest.call(this, 'POST', '/trigger/contact-sourcing/sync', body);
    const contacts = responseData.contacts ?? [];
    return this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(contacts), {
        itemData: { item: i },
    });
}
//# sourceMappingURL=contact.js.map