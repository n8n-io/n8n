import { INodeProperties } from "../../../../workflow/dist/src";
import { Property, Resource } from "../Common/Enums";
import { PropertyDisplay } from "../Common/DisplayNames";
import { IConfigurationMap } from "../Common/Configuration";

//#region Enums

export enum ProjectOperation {
  MoveCard = 'project_moveCard',
}

export enum ProjectPropertyDisplay {
  OperationMoveCard = 'Move Card',
  OperationMoveCardDescription = 'Move Card of Issue',
  Name = 'Project name',
  NameDescription = 'Name of the Project',
  ColumnId = 'Column ID',
  ColumnIdDescription = 'ID of the Project Column',
  TypeDescription = 'Type of the Project',
  OwnerDescription = 'Owner of the Repository',
  OrganizationDescription = 'Organization project',
  RepositoryDescription = 'Repository project',
  UserDescription = 'User project',
}

export enum ProjectProperty {
  Operation = 'project_operation',
  Type = 'project_type',
  Owner = 'project_owner',
  Repository = 'project_repository',
  User = 'project_user',
  Name = 'project_name',
  ColumnId = 'project_columnId',
  IssueNumber = 'project_issueNumber'
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

//#endregion

//#region Options

const ProjectDisplayOptions = {
  show: {
    [Property.Resource]: [
      Resource.Project
    ]
  }
}

const ProjectOperationOptions = [
  {
    name: ProjectPropertyDisplay.OperationMoveCard,
    value: ProjectOperation.MoveCard,
    description: ProjectPropertyDisplay.OperationMoveCardDescription
  }
]

const ProjectTypeOptions = [
  {
    name: PropertyDisplay.Organization,
    value: ProjectType.Organization,
    description: ProjectPropertyDisplay.OrganizationDescription,
  },
  {
    name: PropertyDisplay.Repository,
    value: ProjectType.Repository,
    description: ProjectPropertyDisplay.RepositoryDescription
  },
  {
    name: PropertyDisplay.User,
    value: ProjectType.User,
    description: ProjectPropertyDisplay.UserDescription,
  },
]

//#endregion

const ProjectConfigElementBase: INodeProperties = {
  displayName: '',
  name: '',
  type: 'string',
  default: '',
  displayOptions: ProjectDisplayOptions,
  required: true
}

const ProjectConfig: IConfigurationMap = {
  [ProjectProperty.Operation]: {
    ...ProjectConfigElementBase,
    displayName: PropertyDisplay.Operation,
    name: ProjectProperty.Operation,
    description: PropertyDisplay.Operation,
    type: 'options',
    options: ProjectOperationOptions,
    default: ProjectOperation.MoveCard,
  },
  [ProjectProperty.Type]: {
    ...ProjectConfigElementBase,
    displayName: PropertyDisplay.Type,
    name: ProjectProperty.Type,
    description: ProjectPropertyDisplay.TypeDescription,
    type: 'options',
    options: ProjectTypeOptions,
    default: ProjectOperation.MoveCard,
  },
  [ProjectProperty.Owner]: {
    ...ProjectConfigElementBase,
    displayName: PropertyDisplay.Owner,
    name: ProjectProperty.Owner,
    description: ProjectPropertyDisplay.OwnerDescription,
    displayOptions: {
      ...ProjectDisplayOptions,
      show: {
        [ProjectProperty.Type]: [
          ProjectType.Organization,
          ProjectType.Repository
        ]
      }
    }
  },
  [ProjectProperty.Repository]: {
    ...ProjectConfigElementBase,
    displayName: PropertyDisplay.Repository,
    name: ProjectProperty.Repository,
    description: PropertyDisplay.Repository,
    displayOptions: {
      ...ProjectDisplayOptions,
      show: {
        [ProjectProperty.Type]: [
          ProjectType.Repository
        ]
      }
    }
  },
  [ProjectProperty.User]: {
    ...ProjectConfigElementBase,
    displayName: PropertyDisplay.User,
    name: ProjectProperty.User,
    description: PropertyDisplay.User,
    displayOptions: {
      ...ProjectDisplayOptions,
      show: {
        [ProjectProperty.Type]: [
          ProjectType.User
        ]
      }
    }
  },
  [ProjectProperty.Name]: {
    ...ProjectConfigElementBase,
    displayName: ProjectPropertyDisplay.Name,
    name: ProjectProperty.Name,
    description: ProjectPropertyDisplay.NameDescription
  },
  [ProjectProperty.ColumnId]: {
    ...ProjectConfigElementBase,
    displayName: ProjectPropertyDisplay.ColumnId,
    name: ProjectProperty.ColumnId,
    description: ProjectPropertyDisplay.ColumnIdDescription,
    type: 'number'
  },
  [ProjectProperty.IssueNumber]: {
    ...ProjectConfigElementBase,
    displayName: PropertyDisplay.IssueNumber,
    name: ProjectProperty.IssueNumber,
    description: PropertyDisplay.IssueNumber,
    type: 'number'
  }
}

export const ProjectConfiguration: INodeProperties[] = [
  ProjectConfig[ProjectProperty.Operation],
  ProjectConfig[ProjectProperty.Type],
  ProjectConfig[ProjectProperty.Owner],
  ProjectConfig[ProjectProperty.Repository],
  ProjectConfig[ProjectProperty.User],
  ProjectConfig[ProjectProperty.Name],
  ProjectConfig[ProjectProperty.ColumnId],
  ProjectConfig[ProjectProperty.IssueNumber]
]