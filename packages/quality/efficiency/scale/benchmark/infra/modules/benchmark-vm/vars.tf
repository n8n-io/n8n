variable "location" {
  description = "Region to deploy resources"
  default     = "East US"
}

variable "resource_group_name" {
  description = "Name of the resource group"
}

variable "prefix" {
  description = "Prefix to append to resources"
}

variable "dedicated_host_id" {
  description = "Dedicated Host ID"
}

variable "ssh_public_key" {
  description = "SSH Public Key"
}

variable "vm_size" {
  description = "VM Size"
}

variable "tags" {
  description = "Tags to apply to all resources created by this module"
  type        = map(string)
}
