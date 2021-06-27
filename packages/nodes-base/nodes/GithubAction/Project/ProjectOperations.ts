import { IHookFunctions, IExecuteFunctions } from 'n8n-core';
import { ICredentialDataDecryptedObject } from '../../../../workflow/dist/src';
import { findProject, moveOrCreateIssueCardInColumn } from './ProjectActions';
import { ProjectProperty, ProjectType } from './ProjectConfiguration';

export async function operationMoveCard(
  this: IHookFunctions | IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject,
  projectType: ProjectType,
  projectName: string
): Promise<any> {
  const matchingProject = await findProject.call(this, credentials, projectType, projectName);
  if (matchingProject) {
    const issueNumber = this.getNodeParameter(ProjectProperty.IssueNumber, 0) as number;
    const destinationColumnId = this.getNodeParameter(ProjectProperty.ColumnId, 0) as number;

    return await moveOrCreateIssueCardInColumn.call(
      this,
      credentials,
      matchingProject.id,
      projectType,
      issueNumber,
      destinationColumnId
    );
  }
}
