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
import { ConfigIssueNumber, IssueConfigOperation } from './Issue/ConfigIssue';
import { orchestrateIssueOperation } from './Issue/IssueOrchestrator';
import { ConfigIssueLabelsToAdd, ConfigIssueLabelsToRemove, ConfigIssueLabelToRemove } from './Label/ConfigLabel';
import { ConfigOwner } from './Owner/ConfigOwner';
import { ConfigProjectColumn, ConfigProjectName, ConfigProjectType, ProjectConfigOperation } from './Project/ConfigProject';
import { orchestrateProjectOperation } from './Project/ProjectOrchestrator';
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
        ConfigProjectType,
        IssueConfigOperation,
        ProjectConfigOperation,
        ConfigProjectName,
        ConfigProjectColumn,
        ConfigOwner,
        ConfigRepository,
        ConfigIssueNumber,
        ConfigIssueLabelsToAdd,
        ConfigIssueLabelToRemove,
        ConfigIssueLabelsToRemove
      ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const credentials = this.getCredentials('oAuth2Api') as ICredentialDataDecryptedObject;
    const resource = this.getNodeParameter(Property.Resource, 0) as string;
    let response: any;

    if (resource === Resource.Issue) {
      await orchestrateIssueOperation.call(this, credentials);
    } else if (resource === Resource.Project) {
      response = await orchestrateProjectOperation.call(this, credentials);
    }

    return [this.helpers.returnJsonArray(response)];
    //return this.prepareOutputData(items);
  }
}
