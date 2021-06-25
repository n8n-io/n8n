import { IHookFunctions, IExecuteFunctions } from 'n8n-core';
import { ICredentialDataDecryptedObject } from '../../../../workflow/dist/src';
import { getUser } from '../../PhilipsHue/GenericFunctions';
import { IProject } from './ProjectEntities';
import { getOrganizationProjects, getRepositoryProjects, getUserProjects } from './ProjectRequests';

export async function findOrganizationalProject(
  this: IHookFunctions | IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject,
  owner: string,
  projectName: string
): Promise<IProject | undefined> {
  const response = await getOrganizationProjects.call(this, credentials, owner) as IProject[];
  return response.find(project => project.name.toLocaleLowerCase() === projectName.toLocaleLowerCase());
}

export async function findRepositoryProject(
  this: IHookFunctions | IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject,
  owner: string,
  repository: string,
  projectName: string
): Promise<IProject | undefined> {
  const response = await getRepositoryProjects.call(this, credentials, owner, repository) as IProject[];
  return response.find(project => project.name.toLocaleLowerCase() === projectName.toLocaleLowerCase());
}

export async function findUserProject(
  this: IHookFunctions | IExecuteFunctions,
  credentials: ICredentialDataDecryptedObject,
  user: string,
  projectName: string
): Promise<IProject | undefined> {
  const response = await getUserProjects.call(this, credentials, user) as IProject[];
  return response.find(project => project.name.toLocaleLowerCase() === projectName.toLocaleLowerCase());
}