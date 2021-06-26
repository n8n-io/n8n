import { IExecuteFunctions } from 'n8n-core';
import { ICredentialDataDecryptedObject } from '../../../../workflow/dist/src';
import { IIssue } from '../Issue/IssueEntities';
import { getIssue } from '../Issue/IssueRequests';
import { ProjectKnownIssueId, ProjectMovePosition, ProjectOperation, ProjectProperty, ProjectType } from './ConfigProject';
import { findOrganizationalProject, findRepositoryProject, findUserProject } from './ProjectActions';
import { IProject, IProjectCard, IProjectColumn } from './ProjectEntities';
import { createCard, getCardsOfColumn, getColumns, moveCard } from './ProjectRequests';

export async function orchestrateProjectOperation(
  this: IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject
): Promise<any> {
  const operation = this.getNodeParameter(ProjectProperty.Operation, 0) as ProjectOperation;
  const projectName = this.getNodeParameter(ProjectProperty.Name, 0) as string;
  const projectType = this.getNodeParameter(ProjectProperty.Type, 0) as ProjectType;

  if (operation === ProjectOperation.MoveCard) {
    let matchingProject;

    if (projectType === ProjectType.Organization) {
      const owner = this.getNodeParameter(ProjectProperty.Owner, 0) as string;
      matchingProject = await findOrganizationalProject.call(this, credentials, owner, projectName) as IProject;
    } else if (projectType === ProjectType.Repository) {
      const owner = this.getNodeParameter(ProjectProperty.Owner, 0) as string;
      const repository = this.getNodeParameter(ProjectProperty.Repository, 0) as string;
      matchingProject = await findRepositoryProject.call(this, credentials, owner, repository, projectName) as IProject;
    } else if (projectType === ProjectType.User) {
      const user = this.getNodeParameter(ProjectProperty.Owner, 0) as string;
      matchingProject = await findUserProject.call(this, credentials, user, projectName) as IProject;
    }

    if (matchingProject) {
      let matchingCard;
      const issueNumber = this.getNodeParameter(ProjectProperty.IssueNumber, 0) as number;

      const columns = await getColumns.call(this, credentials, matchingProject.id) as IProjectColumn[];
      for (const column of columns) {
        const cards = await getCardsOfColumn.call(this, credentials, column.id) as IProjectCard[];
        matchingCard = cards.find(card => card.content_url.split('/')[7] === issueNumber.toString());
        if (matchingCard) {
          break;
        }
      }

      const columnId = this.getNodeParameter(ProjectProperty.ColumnId, 0) as number;
      if (matchingCard) {
        await moveCard.call(this, credentials, matchingCard.id, columnId, ProjectMovePosition.Bottom);
      } else {
        const owner = this.getNodeParameter(ProjectProperty.Owner, 0) as string;
        const knownIssueId = this.getNodeParameter(ProjectProperty.KnownIssueId, 0) as ProjectKnownIssueId;
        let issueId: number | undefined;

        if (knownIssueId === ProjectKnownIssueId.Yes) {
          issueId = this.getNodeParameter(ProjectProperty.IssueId, 0) as number;
        } else if (knownIssueId === ProjectKnownIssueId.No) {
          const repository = this.getNodeParameter(ProjectProperty.IssueRepository, 0) as string;
          const issue = await getIssue.call(this, credentials, owner, repository, issueNumber) as IIssue;
          issueId = issue.id;
        }

        if (issueId) {
          await createCard.call(this, credentials, columnId, issueId);
        }
      }
    }
  }
}
