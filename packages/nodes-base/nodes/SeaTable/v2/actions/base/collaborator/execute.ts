import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import { seaTableApiRequest } from '../../../GenericFunctions';
import { ICollaborator } from '../../Interfaces';

export async function collaborator(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const searchString = this.getNodeParameter('searchString', index) as string;

	const collaboratorsResult = await seaTableApiRequest.call(
		this,
		{},
		'GET',
		'/dtable-server/api/v1/dtables/{{dtable_uuid}}/related-users/',
	);
	const collaborators = collaboratorsResult.user_list || [];

	const collaborator = collaborators.filter(
		(col: ICollaborator) =>
			col.contact_email.includes(searchString) || col.name.includes(searchString),
	);

	return this.helpers.returnJsonArray(collaborator as IDataObject[]);
}
