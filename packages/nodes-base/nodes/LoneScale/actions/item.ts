import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { lonescaleApiRequest } from '../GenericFunctions';

export async function add(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let firstName = '';
	let lastName = '';
	let currentPosition = '';
	let fullName = '';
	let email = '';
	let linkedinUrl = '';
	let companyName = '';
	let domain = '';
	let location = '';
	let contactId = '';

	const entity = this.getNodeParameter('type', i) as string;
	const listId = this.getNodeParameter('list', i) as string;
	if (entity === 'PEOPLE') {
		const peopleAdditionalFields = this.getNodeParameter('peopleAdditionalFields', i) as {
			email: string;
			full_name: string;
			current_position: string;
			linkedin_url: string;
			company_name: string;
			domain: string;
			location: string;
			contact_id: string;
		};
		firstName = this.getNodeParameter('first_name', i) as string;
		lastName = this.getNodeParameter('last_name', i) as string;
		fullName = peopleAdditionalFields?.full_name;
		currentPosition = peopleAdditionalFields?.current_position;
		email = peopleAdditionalFields?.email;
		linkedinUrl = peopleAdditionalFields?.linkedin_url;
		companyName = peopleAdditionalFields?.company_name;
		domain = peopleAdditionalFields?.domain;
		location = peopleAdditionalFields?.location;
		contactId = peopleAdditionalFields?.contact_id;
	}
	if (entity === 'COMPANY') {
		const companyAdditionalFields = this.getNodeParameter('companyAdditionalFields', i) as {
			linkedin_url: string;
			domain: string;
			location: string;
			contact_id: string;
		};
		companyName = this.getNodeParameter('company_name', i) as string;
		linkedinUrl = companyAdditionalFields?.linkedin_url;
		domain = companyAdditionalFields?.domain;
		location = companyAdditionalFields?.location;
		contactId = companyAdditionalFields?.contact_id;
	}

	const body: IDataObject = {
		...(firstName && { first_name: firstName }),
		...(lastName && { last_name: lastName }),
		...(fullName && { full_name: fullName }),
		...(linkedinUrl && { linkedin_url: linkedinUrl }),
		...(companyName && { company_name: companyName }),
		...(currentPosition && { current_position: currentPosition }),
		...(domain && { domain }),
		...(location && { location }),
		...(email && { email }),
		...(contactId && { contact_id: contactId }),
	};

	const responseData = await lonescaleApiRequest.call(this, 'POST', `/lists/${listId}/item`, body);
	return this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), {
		itemData: { item: i },
	});
}
