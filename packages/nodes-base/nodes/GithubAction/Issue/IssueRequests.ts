import { IExecuteFunctions, IHookFunctions } from 'n8n-core';
import { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { githubRequest } from '../Common/GenericFunctions';
import { HttpMethod } from '../Common/HttpMethod';

export async function getLabelsOfIssue(
  this: IHookFunctions | IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject,
  owner: string,
  repository: string,
  issue_number: number
): Promise<any> {
  const endpoint = `/repos/${owner}/${repository}/issues/${issue_number}/labels`;
  return await githubRequest.call(this, credentials, HttpMethod.GET, endpoint, {});
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
  return await githubRequest.call(this, credentials, HttpMethod.PUT, endpoint, labels);
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
  return await githubRequest.call(this, credentials, HttpMethod.POST, endpoint, labelsToAdd);
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
  return await githubRequest.call(this, credentials, HttpMethod.DELETE, endpoint, {});
}

export async function getIssue(
  this: IHookFunctions | IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject,
  owner: string,
  repository: string,
  issueNumber: number
): Promise<any> {
  const endpoint = `/repos/${owner}/${repository}/issues/${issueNumber}`;
  return await githubRequest.call(this, credentials, HttpMethod.GET, endpoint, {});
}
