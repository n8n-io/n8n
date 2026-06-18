import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { lonescaleApiRequest } from '../GenericFunctions';
import type { CompanySearchResponse } from '../types';

export async function search(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const domain = this.getNodeParameter('searchDomain', i) as string;
	const linkedinId = this.getNodeParameter('searchLinkedinId', i) as string;
	const slug = this.getNodeParameter('searchSlug', i) as string;
	const name = this.getNodeParameter('searchName', i) as string;
	const enrich = this.getNodeParameter('searchEnrich', i) as boolean;

	if (!domain && !linkedinId && !slug && !name) {
		throw new NodeOperationError(
			this.getNode(),
			'Provide at least one company identifier: domain, Linkedin ID, slug or name',
			{ itemIndex: i },
		);
	}

	const qs: IDataObject = {
		...(domain && { domain }),
		...(linkedinId && { linkedin_id: linkedinId }),
		...(slug && { slug }),
		...(name && { name }),
		...(enrich && { enrich: true }),
	};

	const responseData: CompanySearchResponse = await lonescaleApiRequest.call(
		this,
		'GET',
		'/companies/search',
		{},
		qs,
	);
	const results = responseData.results ?? [];
	return this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(results), {
		itemData: { item: i },
	});
}
