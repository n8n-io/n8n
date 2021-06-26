import {
  IExecuteFunctions,
} from 'n8n-core';
import {
  ICredentialDataDecryptedObject,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { Property, Resource } from './Common/Enums';
import { ConfigCredentials } from './Credentials/ConfigCredentials';
import { IssueConfiguration } from './Issue/ConfigIssue';
import { orchestrateIssueOperation } from './Issue/IssueOrchestrator';
import { ProjectConfiguration } from './Project/ConfigProject';
import { orchestrateProjectOperation } from './Project/ProjectOrchestrator';
import { ConfigResource } from './Common/ConfigResource';

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
        //ConfigResource,
        // ...IssueConfiguration,
        // ...ProjectConfiguration,
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
