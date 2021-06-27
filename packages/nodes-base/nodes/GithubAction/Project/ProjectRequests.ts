import { IExecuteFunctions, IHookFunctions } from 'n8n-core';
import { ICredentialDataDecryptedObject } from '../../../../workflow/dist/src';
import { HttpMethod } from '../Common/HttpMethod';
import { githubRequest } from '../Common/GenericFunctions';
import { ProjectMovePosition } from './ProjectConfiguration';

export async function getOrganizationProjects(
  this: IHookFunctions | IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject,
  owner: string
): Promise<any> {
  const endpoint = `/orgs/${owner}/projects`;
  return await githubRequest.call(this, credentials, HttpMethod.GET, endpoint, {});
}

export async function getRepositoryProjects(
  this: IHookFunctions | IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject,
  owner: string,
  repository: string
): Promise<any> {
  const endpoint = `/repos/${owner}/${repository}/projects`;
  return await githubRequest.call(this, credentials, HttpMethod.GET, endpoint, {});
}

export async function getUserProjects(
  this: IHookFunctions | IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject,
  user: string,
): Promise<any> {
  const endpoint = `/users/${user}/projects`;
  return await githubRequest.call(this, credentials, HttpMethod.GET, endpoint, {});
}

export async function getColumns(
  this: IHookFunctions | IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject,
  projectId: number
) : Promise<any> {
  const endpoint = `/projects/${projectId}/columns`;
  return await githubRequest.call(this, credentials, HttpMethod.GET, endpoint, {});
}

export async function getCardsOfColumn(
  this: IHookFunctions | IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject,
  columnId: number
) : Promise<any> {
  const endpoint = `/projects/columns/${columnId}/cards`;
  return await githubRequest.call(this, credentials, HttpMethod.GET, endpoint, {});
}

export async function createCard(
  this: IHookFunctions | IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject,
  columnId: number,
  contentId: number
): Promise<any> {
  const endpoint = `/projects/columns/${columnId}/cards`;
  const body = {
    'content_type': 'Issue',
    'content_id': contentId
  }
  return await githubRequest.call(this, credentials, HttpMethod.POST, endpoint, body);
}

export async function moveCard(
  this: IHookFunctions | IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject,
  cardId: number,
  columnId: number,
  position: ProjectMovePosition
): Promise<any> {
  const endpoint = `/projects/columns/cards/${cardId}/moves`;
  const body = {
    'position': position,
    'column_id': columnId
  }
  return await githubRequest.call(this, credentials, HttpMethod.POST, endpoint, body);
}
