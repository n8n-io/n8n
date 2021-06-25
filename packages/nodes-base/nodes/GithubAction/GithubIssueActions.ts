import {
  IExecuteFunctions,
  IHookFunctions
} from 'n8n-core';
import {
  ICredentialDataDecryptedObject,
  IDataObject,
} from 'n8n-workflow';
import * as _ from 'lodash';
import { ApiMethod } from './Types';
import { githubRequest } from './GenericFunctions';

export async function getLabelsOfIssue(
  this: IHookFunctions | IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject,
  owner: string,
  repository: string,
  issue_number: number
): Promise<any> {
  const endpoint = `/repos/${owner}/${repository}/issues/${issue_number}/labels`;
  return await githubRequest.call(this, credentials, ApiMethod.GET, endpoint, {});
}

export async function setLabelsOfIssue(
  this: IHookFunctions | IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject,
  owner: string,
  repository: string,
  issue_number: number,
  labels: string[]
): Promise<any> {
  const endpoint = `/repos/${owner}/${repository}/issues/${issue_number}/labels`;
  return await githubRequest.call(this, credentials, ApiMethod.PUT, endpoint, labels);
}

export async function addLabelsToIssue(
  this: IHookFunctions | IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject,
  owner: string,
  repository: string,
  issue_number: number,
  labelsToAdd: string[],
): Promise<any> {
  const endpoint = `/repos/${owner}/${repository}/issues/${issue_number}/labels`;
  return await githubRequest.call(this, credentials, ApiMethod.POST, endpoint, labelsToAdd);
}

export async function removeLabelOfIssue(
  this: IHookFunctions | IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject,
  owner: string,
  repository: string,
  issue_number: number,
  labelToRemove: string,
): Promise<any> {
  const endpoint = `/repos/${owner}/${repository}/issues/${issue_number}/labels/${labelToRemove}`
  return await githubRequest.call(this, credentials, ApiMethod.DELETE, endpoint, {});
}

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
