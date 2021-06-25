import { IExecuteFunctions } from 'n8n-core';
import { ICredentialDataDecryptedObject } from '../../../../workflow/dist/src';
import { Property } from '../Common';
import { getArrayFromNodeParameter } from '../GenericFunctions';
import { IssueOperation } from './ConfigIssue';
import { addLabelsToIssue, removeLabelOfIssue, updateLabelsOfIssue } from './IssueActions';

export async function orchestrateIssueOperation(
  this: IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject,
  operation: IssueOperation,
  owner: string,
  repository: string,
  issueNumber: number
): Promise<any> {
  if (operation === IssueOperation.UpdateLabels) {
    const labelsToAdd = getArrayFromNodeParameter.call(this, Property.LabelsToAdd, 0);
    const labelsToRemove = getArrayFromNodeParameter.call(this, Property.LabelsToRemove, 0);

    await updateLabelsOfIssue.call(
      this,
      credentials,
      owner,
      repository,
      issueNumber,
      labelsToAdd,
      labelsToRemove);
  } else if (operation === IssueOperation.AddLabels) {
    const labelsToAdd = getArrayFromNodeParameter.call(this, Property.LabelsToAdd, 0);
    await addLabelsToIssue.call(this, credentials, owner, repository, issueNumber, labelsToAdd);
  } else if (operation === IssueOperation.RemoveLabel) {
    const labelToRemove = this.getNodeParameter(Property.LabelToRemove, 0) as string;
    await removeLabelOfIssue.call(this, credentials, owner, repository, issueNumber, labelToRemove);
  }
}