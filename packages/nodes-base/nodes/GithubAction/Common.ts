import { capitalCase } from "change-case";
import { INodeProperties } from "../../../workflow/dist/src";

export enum Property {
  Resource = 'resource',
  Operation = 'operation',
  Owner = 'owner',
  Repository = 'repository',
  IssueNumber = 'issueNumber',
  LabelsToAdd = 'labelsToAdd',
  LabelsToRemove = 'labelsToRemove',
  LabelToRemove = 'labelToRemove',
  ProjectType = 'projectType',
  ProjectName = 'projectName',
  ProjectColumn = 'projectColumn'
}

export enum Resource {
  Issue = 'issue',
  Project = 'project'
}

export const ConfigOperationBase: INodeProperties = {
  displayName: capitalCase(Property.Operation),
  name: Property.Operation,
  type: 'options',
  default: ''
}