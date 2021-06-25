import { IExecuteFunctions, IHookFunctions } from 'n8n-core';
import { ICredentialDataDecryptedObject, IDataObject } from '../../../../workflow/dist/src';
import { getLabelsOfIssue, setLabelsOfIssue } from './IssueRequests';
import * as _ from 'lodash';

export async function updateLabelsOfIssue(
  this: IHookFunctions | IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject,
  owner: string,
  repository: string,
  issue_number: number,
  labelsToAdd: string[],
  labelsToRemove: string[]
): Promise<any> {
  const response = await getLabelsOfIssue.call(this, credentials, owner, repository, issue_number) as IDataObject[];
  const initialLabels = response.map(item => item.name);

  let updatedLabels = _.union(initialLabels, labelsToAdd);
  updatedLabels = _.pullAll(updatedLabels, labelsToRemove);

  await setLabelsOfIssue.call(this, credentials, owner, repository, issue_number, updatedLabels as string[]);
}
