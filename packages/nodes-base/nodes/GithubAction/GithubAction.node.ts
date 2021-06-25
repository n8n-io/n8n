import {
  IExecuteFunctions,
} from 'n8n-core';

import {
  ICredentialDataDecryptedObject,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { getArrayFromNodeParameter } from './GenericFunctions';
import { addLabelsToIssue, removeLabelOfIssue, updateLabelsOfIssue } from './GithubIssueActions';

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
      credentials: [
        {
          name: 'oAuth2Api',
          required: true
        },
      ],
      properties: [
        {
          displayName: 'Resource',
          name: 'resource',
          type: 'options',
          options: [
            {
              name: 'Issue',
              value: 'issue',
            },
          ],
          default: 'issue',
          required: true,
          description: 'Issue to alter',
        },
        {
          displayName: 'Operation',
          name: 'operation',
          type: 'options',
          displayOptions: {
            show: {
              resource: [
                'issue',
              ],
            },
          },
          options: [
            {
              name: 'Update labels',
              value: 'updateLabels',
              description: 'Update labels of Issue',
            },
            {
              name: 'Add labels',
              value: 'addLabels',
              description: 'Add labels of Issue',
            },
            {
              name: 'Remove label',
              value: 'removeLabel',
              description: 'Remove label of Issue',
            },
          ],
          default: '',
          description: 'Operations on Issue',
        },
        {
          displayName: 'Owner',
          name: 'owner',
          type: 'string',
          required: true,
          default: '',
          description: 'Owner of the repository'
        },
        {
          displayName: 'Repository',
          name: 'repository',
          type: 'string',
          required: true,
          default: '',
          description: 'Repository'
        },
        {
          displayName: 'Issue ID',
          name: 'issue_number',
          type: 'number',
          required: true,
          default: '',
          description: "ID of the issue"
        },
        {
          displayName: 'Labels to add',
          name: 'labelsToAdd',
          type: 'fixedCollection',
          placeholder: 'Add a Label',
          typeOptions: {
            multipleValues: true,
          },
          default: {},
          displayOptions: {
            show: {
              resource: [
                'issue'
              ],
              operation: [
                'updateLabels',
                'addLabels'
              ]
            }
          },
          options: [
            {
              name: 'parameter',
              displayName: 'Labels',
              values: [
                {
                  displayName: 'Name',
                  name: 'value',
                  type: 'string',
                  default: '',
                  description: 'Name of the Label.',
                }
              ],
            },
          ],
        },
        {
          displayName: 'Label to remove',
          name: 'labelToRemove',
          type: 'string',
          required: true,
          default: '',
          description: 'Name of the label',
          displayOptions: {
            show: {
              resource: [
                'issue'
              ],
              operation: [
                'removeLabel'
              ]
            }
          },
        },
        {
          displayName: 'Labels to remove',
          name: 'labelsToRemove',
          type: 'fixedCollection',
          placeholder: 'Add a Label',
          typeOptions: {
            multipleValues: true,
          },
          default: {},
          displayOptions: {
            show: {
              resource: [
                'issue'
              ],
              operation: [
                'updateLabels'
              ]
            }
          },
          options: [
            {
              name: 'parameter',
              displayName: 'Labels',
              values: [
                {
                  displayName: 'Name',
                  name: 'value',
                  type: 'string',
                  default: '',
                  description: 'Name of the Label.',
                }
              ],
            },
          ],
        }
      ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const credentials = this.getCredentials('oAuth2Api') as ICredentialDataDecryptedObject;
    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;
    const owner = this.getNodeParameter('owner', 0) as string;
    const repository = this.getNodeParameter('repository', 0) as string;
    const issue_number = this.getNodeParameter('issue_number', 0) as number;

    if (resource === 'issue') {
      if (operation === 'updateLabels') {
        const labelsToAdd = getArrayFromNodeParameter.call(this, 'labelsToAdd', 0);
        const labelsToRemove = getArrayFromNodeParameter.call(this, 'labelsToRemove', 0);

        await updateLabelsOfIssue.call(
          this,
          credentials,
          owner,
          repository,
          issue_number,
          labelsToAdd,
          labelsToRemove);
      } else if (operation === 'addLabels') {
        const labelsToAdd = getArrayFromNodeParameter.call(this, 'labelsToAdd', 0);
        await addLabelsToIssue.call(this, credentials, owner, repository, issue_number, labelsToAdd);
      } else if (operation === 'removeLabel') {
        const labelToRemove = this.getNodeParameter('labelToRemove', 0) as string;
        await removeLabelOfIssue.call(this, credentials, owner, repository, issue_number, labelToRemove);
      }
    }
    return [[]];
  }
}
