import { capitalCase } from "change-case";
import { INodeProperties } from "../../../../workflow/dist/src";
import { Property, Resource } from "../Common";
import { ProjectType } from "../Project/ConfigProject";

export const ConfigOwner: INodeProperties = {
  displayName: capitalCase(Property.Owner),
  name: Property.Owner,
  type: 'string',
  required: true,
  default: '',
  description: 'Owner of the repository'
}