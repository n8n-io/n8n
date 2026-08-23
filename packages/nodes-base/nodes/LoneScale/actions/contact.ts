import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { lonescaleApiRequest } from '../GenericFunctions';
import type { ContactSourcingResponse, EnrichResponse } from '../types';

export async function enrich(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const enrichmentType = this.getNodeParameter('enrichmentType', i) as string[];
	const firstName = this.getNodeParameter('firstName', i) as string;
	const lastName = this.getNodeParameter('lastName', i) as string;
	const companyName = this.getNodeParameter('enrichCompanyName', i) as string;
	const companyDomain = this.getNodeParameter('enrichCompanyDomain', i) as string;
	const detectJobChange = this.getNodeParameter('detectJobChange', i) as boolean;
	const additionalFields = this.getNodeParameter('enrichAdditionalFields', i) as {
		email?: string;
		jobTitle?: string;
		linkedinUrl?: string;
		contactId?: string;
	};

	const contact: IDataObject = {
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

	const body: IDataObject = {
		enrichment_type: enrichmentType,
		contacts: [contact],
		...(detectJobChange && { detect_job_change: true }),
	};

	const responseData: EnrichResponse = await lonescaleApiRequest.call(
		this,
		'POST',
		'/trigger/enrich/sync',
		body,
	);
	const contacts = responseData.contacts ?? [];
	return this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(contacts), {
		itemData: { item: i },
	});
}

export async function source(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const companyDomain = this.getNodeParameter('sourceCompanyDomain', i) as string;
	const companyName = this.getNodeParameter('sourceCompanyName', i) as string;
	const companyLinkedinUrl = this.getNodeParameter('sourceCompanyLinkedinUrl', i) as string;

	if (!companyDomain && !companyName && !companyLinkedinUrl) {
		throw new NodeOperationError(
			this.getNode(),
			'Provide at least one company identifier: domain, name or Linkedin URL',
			{ itemIndex: i },
		);
	}
	const additionalFields = this.getNodeParameter('sourceAdditionalFields', i) as {
		disableCompanyInfo?: boolean;
		includedLocations?: string;
		maxResults?: number;
		seniorityLevels?: string[];
	};

	const rawPersonas =
		((this.getNodeParameter('personas', i, {}) as IDataObject).persona as IDataObject[]) ?? [];

	const toList = (value: string) =>
		(value || '')
			.split(',')
			.map((v) => v.trim())
			.filter((v) => v.length > 0);

	const personas = rawPersonas.map((p) => ({
		name: p.name as string,
		job_titles: toList(p.jobTitles as string),
		...(toList(p.excludeJobTitles as string).length && {
			exclude_job_titles: toList(p.excludeJobTitles as string),
		}),
	}));

	const includedLocations = toList(additionalFields.includedLocations ?? '');

	const body: IDataObject = {
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

	const responseData: ContactSourcingResponse = await lonescaleApiRequest.call(
		this,
		'POST',
		'/trigger/contact-sourcing/sync',
		body,
	);
	const contacts = responseData.contacts ?? [];
	return this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(contacts), {
		itemData: { item: i },
	});
}
