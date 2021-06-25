import {
  IExecuteFunctions,
} from 'n8n-core';
import {
  ICredentialDataDecryptedObject,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { Property, Resource } from './Common';
import { ConfigCredentials } from './Credentials/ConfigCredentials';
import { getArrayFromNodeParameter } from './GenericFunctions';
import { ConfigIssueNumber, IssueConfigOperation, IssueOperation } from './Issue/ConfigIssue';
import { addLabelsToIssue, removeLabelOfIssue, updateLabelsOfIssue } from './Issue/IssueActions';
import { orchestrateIssueOperation } from './Issue/IssueOrchestrator';
import { ConfigIssueLabelsToAdd, ConfigIssueLabelsToRemove, ConfigIssueLabelToRemove } from './Label/ConfigLabel';
import { ConfigOwner } from './Owner/ConfigOwner';
import { ConfigRepository } from './Repository/ConfigRepository';
import { ConfigResource } from './Resource/ConfigResource';

export class GithubAction implements INodeType {
  description: INodeTypeDescription = {
      displayName: 'GithubAction',
      name: 'githubAction',
      icon: 'file:githubAction.svg',
      group: ['transform'],
      version: 1,
      description: 'Github Action',
      defaults: {
          name: 'GithubAction',
          color: '#1A82e2',
      },
      inputs: ['main'],
      outputs: ['main'],
      credentials: ConfigCredentials,
      properties: [
        ConfigResource,
        IssueConfigOperation,
        ConfigOwner,
        ConfigRepository,
        ConfigIssueNumber,
        ConfigIssueLabelsToAdd,
        ConfigIssueLabelToRemove,
        ConfigIssueLabelsToRemove
      ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const credentials = this.getCredentials('oAuth2Api') as ICredentialDataDecryptedObject;
    const resource = this.getNodeParameter(Property.Resource, 0) as string;
    const operation = this.getNodeParameter(Property.Operation, 0) as string;
    const owner = this.getNodeParameter(Property.Owner, 0) as string;
    const repository = this.getNodeParameter(Property.Repository, 0) as string;
    const issueNumber = this.getNodeParameter(Property.IssueNumber, 0) as number;

    if (resource === Resource.Issue) {
      await orchestrateIssueOperation.call(
        this, credentials, 
        operation as IssueOperation, 
        owner, 
        repository, 
        issueNumber);
    }
    return [[]];
  }
}
