import { capitalCase } from "change-case";
import { INodeProperties } from "../../../../workflow/dist/src";
import { ConfigOperationBase, Property, Resource } from "../Common";

export enum ProjectOperation {
  MoveCard = 'project_moveCard',
}

export enum ProjectType {
  Organization = 'organization',
  Repository = 'repository',
  User = 'user'
}

export enum ProjectMovePosition {
  Top = 'top',
  Bottom = 'bottom'
}

const OperationDisplayOptions = {
  show: {
    resource: [
      Resource.Project
    ]
  }
}

const OperationOptions = [
  {
    name: 'Move Card',
    value: ProjectOperation.MoveCard,
    description: 'Move Card of Issue',
  }
]

export const ProjectConfigOperation: INodeProperties = {
  ...ConfigOperationBase,
  displayOptions: OperationDisplayOptions,
  options: OperationOptions,
  description: 'Operations on Project',
}

const TypeOptions = [
  {
    name: capitalCase(ProjectType.Organization),
    value: ProjectType.Organization,
    description: 'Organization project',
  },
  {
    name: capitalCase(ProjectType.Repository),
    value: ProjectType.Repository,
    description: 'Repository project',
  },
  {
    name: capitalCase(ProjectType.User),
    value: ProjectType.User,
    description: 'User project',
  },
]

export const ConfigProjectType: INodeProperties = {
  displayName: 'Project type',
  name: Property.ProjectType,
  type: 'options',
  options: TypeOptions,
  displayOptions: OperationDisplayOptions,
  required: true,
  default: ProjectType.Organization,
  description: 'Type of Project'
}

export const ConfigProjectName: INodeProperties = {
  displayName: 'Project name',
  name: Property.ProjectName,
  type: 'string',
  required: true,
  displayOptions: OperationDisplayOptions,
  default: '',
  description: "Name of Project"
}

export const ConfigProjectColumn: INodeProperties = {
  displayName: 'Project column',
  name: Property.ProjectColumn,
  type: 'number',
  required: true,
  displayOptions: OperationDisplayOptions,
  default: '',
  description: "ID of Column"
}