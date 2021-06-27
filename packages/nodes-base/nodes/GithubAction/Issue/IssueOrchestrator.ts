import { IExecuteFunctions } from 'n8n-core';
import { ICredentialDataDecryptedObject } from '../../../../workflow/dist/src';
import { IssueOperation, IssueProperty } from './IssueConfiguration';
import { operationAddLabels, operationRemoveLabel, operationUpdateLabels } from './IssueOperations';

export async function orchestrateIssueOperation(
  this: IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject
): Promise<any> {
  const operation = this.getNodeParameter(IssueProperty.Operation, 0) as IssueOperation;
  const owner = this.getNodeParameter(IssueProperty.Owner, 0) as string;
  const repository = this.getNodeParameter(IssueProperty.Repository, 0) as string;
  const issueNumber = this.getNodeParameter(IssueProperty.Number, 0) as number;

  if (operation === IssueOperation.UpdateLabels) {
    return await operationUpdateLabels.call(this, credentials, owner, repository, issueNumber);
  } else if (operation === IssueOperation.AddLabels) {
    return await operationAddLabels.call(this, credentials, owner, repository, issueNumber);
  } else if (operation === IssueOperation.RemoveLabel) {
    return await operationRemoveLabel.call(this, credentials, owner, repository, issueNumber);
  }
}
