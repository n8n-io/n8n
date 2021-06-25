import { IDisplayOptions, INodeProperties } from "../../../../workflow/dist/src"
import { Property, Resource } from "../Common"
import { IssueOperation } from "../Issue/ConfigIssue";

const NameOfLabel = 'Name of the Label';
const AddLabel = 'Add a Label';
const Labels = 'Labels';

const ConfigDisplayOptionsBase: IDisplayOptions = {
  show: {
    resource: [
      Resource.Issue
    ]
  }
}

export const ConfigIssueLabelsToAdd: INodeProperties = {
  displayName: 'Labels to add',
  name: Property.LabelsToAdd,
  type: 'fixedCollection',
  placeholder: AddLabel,
  typeOptions: {
    multipleValues: true,
  },
  default: {},
  displayOptions: {
    ...ConfigDisplayOptionsBase,
    show: {
      operation: [
        IssueOperation.UpdateLabels,
        IssueOperation.AddLabels
      ]
    }
  },
  options: [
    {
      name: 'parameter',
      displayName: Labels,
      values: [
        {
          displayName: 'Name',
          name: 'value',
          type: 'string',
          default: '',
          description: NameOfLabel,
        }
      ],
    },
  ],
}

export const ConfigIssueLabelToRemove: INodeProperties = {
  displayName: 'Label to remove',
  name: Property.LabelToRemove,
  type: 'string',
  required: true,
  default: '',
  description: NameOfLabel,
  displayOptions: {
    ...ConfigDisplayOptionsBase,
    show: {
      operation: [
        IssueOperation.RemoveLabel
      ]
    }
  }
}

export const ConfigIssueLabelsToRemove: INodeProperties = {
  displayName: 'Labels to remove',
  name: Property.LabelsToRemove,
  type: 'fixedCollection',
  placeholder: AddLabel,
  typeOptions: {
    multipleValues: true,
  },
  default: {},
  displayOptions: {
    ...ConfigDisplayOptionsBase,
    show: {
      operation: [
        IssueOperation.UpdateLabels
      ]
    }
  },
  options: [
    {
      name: 'parameter',
      displayName: Labels,
      values: [
        {
          displayName: 'Name',
          name: 'value',
          type: 'string',
          default: '',
          description: NameOfLabel,
        }
      ],
    },
  ],
}
