import { IExecuteFunctions } from 'n8n-core';
import { ICredentialDataDecryptedObject } from '../../../../workflow/dist/src';
import { getArrayFromNodeParameter } from '../GenericFunctions';
import { IssueOperation, IssueProperty } from './IssueConfiguration';
import { addLabelsToIssue, removeLabelOfIssue } from './IssueRequests';
import { updateLabelsOfIssue } from './IssueActions';

export async function orchestrateIssueOperation(
  this: IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject
): Promise<any> {
  const operation = this.getNodeParameter(IssueProperty.Operation, 0) as IssueOperation;
  const owner = this.getNodeParameter(IssueProperty.Owner, 0) as string;
  const repository = this.getNodeParameter(IssueProperty.Repository, 0) as string;
  const issueNumber = this.getNodeParameter(IssueProperty.Number, 0) as number;

  if (operation === IssueOperation.UpdateLabels) {
    const labelsToAdd = getArrayFromNodeParameter.call(this, IssueProperty.LabelsToAdd, 0);
    const labelsToRemove = getArrayFromNodeParameter.call(this, IssueProperty.LabelsToRemove, 0);

    await updateLabelsOfIssue.call(
      this,
      credentials,
      owner,
      repository,
      issueNumber,
      labelsToAdd,
      labelsToRemove);
  } else if (operation === IssueOperation.AddLabels) {
    const labelsToAdd = getArrayFromNodeParameter.call(this, IssueProperty.LabelsToAdd, 0);
    await addLabelsToIssue.call(this, credentials, owner, repository, issueNumber, labelsToAdd);
  } else if (operation === IssueOperation.RemoveLabel) {
    const labelToRemove = this.getNodeParameter(IssueProperty.LabelToRemove, 0) as string;
    await removeLabelOfIssue.call(this, credentials, owner, repository, issueNumber, labelToRemove);
  }
}
