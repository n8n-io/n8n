import { capitalCase } from "change-case";
import { INodeProperties } from "../../../../workflow/dist/src";
import { Property } from "../Common";

export const ConfigOwner: INodeProperties = {
  displayName: capitalCase(Property.Owner),
  name: Property.Owner,
  type: 'string',
  required: true,
  default: '',
  description: 'Owner of the repository'
}