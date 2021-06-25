import { INodeProperties, INodePropertyOptions } from "../../../../workflow/dist/src"
import { ConfigOperationBase, Property, Resource } from "../Common"

export enum IssueOperation {
  AddLabels = 'issue_addLabels',
  RemoveLabel = 'issue_removeLabel',
  UpdateLabels = 'issue_updateLabels'
}

const OperationDisplayOptions = {
  show: {
    resource: [
      Resource.Issue
    ]
  }
}

const OperationOptions = [
  {
    name: 'Update labels',
    value: IssueOperation.UpdateLabels,
    description: 'Update labels of Issue',
  },
  {
    name: 'Add labels',
    value: IssueOperation.AddLabels,
    description: 'Add labels of Issue',
  },
  {
    name: 'Remove label',
    value: IssueOperation.RemoveLabel,
    description: 'Remove label of Issue',
  },
]

export const IssueConfigOperation: INodeProperties = {
  ...ConfigOperationBase,
  displayOptions: OperationDisplayOptions,
  options: OperationOptions,
  description: 'Operations on Issue',
}

export const ConfigIssueNumber: INodeProperties = {
  displayName: 'Issue ID',
  name: Property.IssueNumber,
  type: 'number',
  required: true,
  default: '',
  description: "ID of the issue"
}
