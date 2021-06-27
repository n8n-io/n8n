import { IHookFunctions, IExecuteFunctions } from 'n8n-core';
import { ICredentialDataDecryptedObject } from '../../../../workflow/dist/src';
import { getArrayFromNodeParameter } from '../Common/GenericFunctions';
import { updateLabelsOfIssue } from './IssueActions';
import { IssueProperty } from './IssueConfiguration';
import { addLabelsToIssue, removeLabelOfIssue } from './IssueRequests';

export async function operationUpdateLabels(
  this: IHookFunctions | IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject,
  owner: string,
  repository: string,
  issueNumber: number
): Promise<any> {
  const labelsToAdd = getArrayFromNodeParameter.call(this, IssueProperty.LabelsToAdd, 0);
  const labelsToRemove = getArrayFromNodeParameter.call(this, IssueProperty.LabelsToRemove, 0);

  return await updateLabelsOfIssue.call(
    this,
    credentials,
    owner,
    repository,
    issueNumber,
    labelsToAdd,
    labelsToRemove);
}

export async function operationAddLabels(
  this: IHookFunctions | IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject,
  owner: string,
  repository: string,
  issueNumber: number
): Promise<any> {
  const labelsToAdd = getArrayFromNodeParameter.call(this, IssueProperty.LabelsToAdd, 0);
  return await addLabelsToIssue.call(
    this,
    credentials,
    owner,
    repository, 
    issueNumber,
    labelsToAdd);
}

export async function operationRemoveLabel(
  this: IHookFunctions | IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject,
  owner: string,
  repository: string,
  issueNumber: number
): Promise<any> {
  const labelToRemove = this.getNodeParameter(IssueProperty.LabelToRemove, 0) as string;
  return await removeLabelOfIssue.call(
    this,
    credentials,
    owner,
    repository,
    issueNumber,
    labelToRemove);
}
