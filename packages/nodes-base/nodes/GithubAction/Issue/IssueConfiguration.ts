import { INodeProperties } from "../../../../workflow/dist/src"
import { IConfigurationMap } from "../Common/Configuration"
import { PropertyDisplay } from "../Common/DisplayNames"
import { Property, Resource } from "../Common/Enums"

//#region Enums

export enum IssueOperation {
  AddLabels = 'issue_addLabels',
  RemoveLabel = 'issue_removeLabel',
  UpdateLabels = 'issue_updateLabels'
}

export enum IssuePropertyDisplay {
  OperationUpdateLabels = 'Update labels',
  OperationUpdateLabelsDescription = 'Update labels of Issue',
  OperationAddLabels = 'Add labels',
  OperationAddLabelsDescription = 'Add labels of Issue',
  OperationRemoveLabel = 'Remove label',
  OperationRemoveLabelDescription = 'Remove label of Issue',
  OwnerDescription = 'Owner of the Repository',
  Labels = 'Labels',
  AddLabel = 'Add a Label',
  LabelsToAdd = 'Labels to Add',
  LabelsToRemove = 'Labels to Remove',
  LabelToRemove = 'Label to Remove',
  Name = 'Name',
  NameOfLabel = 'Name of Label'
}

export enum IssueProperty {
  Operation = 'issue_operation',
  Owner = 'issue_owner',
  Repository = 'issue_repository',
  Number = 'issue_number',
  LabelsToAdd = 'issue_labelsToAdd',
  LabelsToRemove = 'issue_labelsToRemove',
  LabelToRemove = 'issue_labelToRemove'
}

//#endregion

//#region Options

const IssueDisplayOptions = {
  show: {
    [Property.Resource]: [
      Resource.Issue
    ]
  },
  hide: {
    [Property.Resource]: [
      Resource.Project
    ]
  }
}

const IssueOperationOptions = [
  {
    name: IssuePropertyDisplay.OperationUpdateLabels,
    value: IssueOperation.UpdateLabels,
    description: IssuePropertyDisplay.OperationUpdateLabelsDescription,
  },
  {
    name: IssuePropertyDisplay.OperationAddLabels,
    value: IssueOperation.AddLabels,
    description: IssuePropertyDisplay.OperationAddLabelsDescription,
  },
  {
    name: IssuePropertyDisplay.OperationRemoveLabel,
    value: IssueOperation.RemoveLabel,
    description: IssuePropertyDisplay.OperationRemoveLabelDescription,
  },
]

//#endregion

const IssueConfigElementBase: INodeProperties = {
  displayName: '',
  name: '',
  type: 'string',
  default: '',
  displayOptions: IssueDisplayOptions,
  required: true
}

const IssueConfig: IConfigurationMap = {
  [IssueProperty.Operation]: {
    ...IssueConfigElementBase,
    displayName: PropertyDisplay.Operation,
    name: IssueProperty.Operation,
    description: PropertyDisplay.Operation,
    type: 'options',
    options: IssueOperationOptions
  },
  [IssueProperty.Owner]: {
    ...IssueConfigElementBase,
    displayName: PropertyDisplay.Owner,
    name: IssueProperty.Owner,
    description: IssuePropertyDisplay.OwnerDescription
  },
  [IssueProperty.Repository]: {
    ...IssueConfigElementBase,
    displayName: PropertyDisplay.Repository,
    name: IssueProperty.Repository,
    description: PropertyDisplay.Repository
  },
  [IssueProperty.Number]: {
    ...IssueConfigElementBase,
    displayName: PropertyDisplay.IssueNumber,
    name: IssueProperty.Number,
    description: PropertyDisplay.IssueNumber,
    type: 'number'
  },
  [IssueProperty.LabelsToAdd]: {
    ...IssueConfigElementBase,
    displayName: IssuePropertyDisplay.LabelsToAdd,
    name: IssueProperty.LabelsToAdd,
    type: 'fixedCollection',
    placeholder: IssuePropertyDisplay.AddLabel,
    typeOptions: {
      multipleValues: true,
    },
    default: {},
    displayOptions: {
      ...IssueDisplayOptions,
      show: {
        [IssueProperty.Operation]: [
          IssueOperation.UpdateLabels,
          IssueOperation.AddLabels
        ]
      }
    },
    options: [
      {
        name: 'parameter',
        displayName: IssuePropertyDisplay.Labels,
        values: [
          {
            displayName: IssuePropertyDisplay.Name,
            name: 'value',
            type: 'string',
            default: '',
            description: IssuePropertyDisplay.NameOfLabel,
          }
        ],
      },
    ],
  },
  [IssueProperty.LabelsToRemove]: {
    ...IssueConfigElementBase,
    displayName: IssuePropertyDisplay.LabelsToRemove,
    name: IssueProperty.LabelsToRemove,
    type: 'fixedCollection',
    placeholder: IssuePropertyDisplay.AddLabel,
    typeOptions: {
      multipleValues: true,
    },
    default: {},
    displayOptions: {
      ...IssueDisplayOptions,
      show: {
        [IssueProperty.Operation]: [
          IssueOperation.UpdateLabels
        ]
      }
    },
    options: [
      {
        name: 'parameter',
        displayName: IssuePropertyDisplay.Labels,
        values: [
          {
            displayName: IssuePropertyDisplay.Name,
            name: 'value',
            type: 'string',
            required: true,
            default: '',
            description: IssuePropertyDisplay.NameOfLabel,
          }
        ],
      },
    ],
  },
  [IssueProperty.LabelToRemove]: {
    ...IssueConfigElementBase,
    displayName: IssuePropertyDisplay.LabelToRemove,
    name: IssueProperty.LabelToRemove,
    description: IssuePropertyDisplay.NameOfLabel,
    displayOptions: {
      ...IssueDisplayOptions,
      show: {
        [IssueProperty.Operation]: [
          IssueOperation.RemoveLabel
        ]
      }
    }
  }
}

export const IssueConfiguration: INodeProperties[] = [
  IssueConfig[IssueProperty.Operation],
  IssueConfig[IssueProperty.Owner],
  IssueConfig[IssueProperty.Repository],
  IssueConfig[IssueProperty.Number],
  IssueConfig[IssueProperty.LabelsToAdd],
  IssueConfig[IssueProperty.LabelsToRemove],
  IssueConfig[IssueProperty.LabelToRemove]
]
