import { capitalCase } from "change-case";
import { INodeProperties } from "../../../../workflow/dist/src";
import { Property, Resource } from "../Common";

export const ConfigResource: INodeProperties = {
  displayName: capitalCase(Property.Resource),
  name: Property.Resource,
  type: 'options',
  options: [
    {
      name: capitalCase(Resource.Issue),
      value: Resource.Issue,
    },
    {
      name: capitalCase(Resource.Project),
      value: Resource.Project
    }
  ],
  default: Resource.Issue,
  required: true,
  description: capitalCase(Property.Resource)
}
