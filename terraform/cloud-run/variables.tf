variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run deployment"
  type        = string
  default     = "asia-northeast1"
}

variable "service_name" {
  description = "Name of the Cloud Run service"
  type        = string
  default     = "n8n"
}

variable "container_image" {
  description = "Container image URL (e.g., gcr.io/PROJECT_ID/n8n:latest)"
  type        = string
}

variable "node_env" {
  description = "Node environment"
  type        = string
  default     = "production"
}

variable "db_type" {
  description = "Database type (postgres, mysql, sqlite)"
  type        = string
  default     = "postgres"
}

variable "db_host" {
  description = "Database host"
  type        = string
}

variable "db_port" {
  description = "Database port"
  type        = string
  default     = "5432"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "n8n"
}

variable "db_user" {
  description = "Database user"
  type        = string
  default     = "n8n"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "n8n_encryption_key" {
  description = "N8N encryption key for credentials"
  type        = string
  sensitive   = true
}

variable "cpu_limit" {
  description = "CPU limit for the container"
  type        = string
  default     = "2"
}

variable "memory_limit" {
  description = "Memory limit for the container"
  type        = string
  default     = "2Gi"
}

variable "timeout_seconds" {
  description = "Timeout for Cloud Run service"
  type        = number
  default     = 3600
}

variable "max_instances" {
  description = "Maximum number of instances"
  type        = string
  default     = "10"
}

variable "min_instances" {
  description = "Minimum number of instances"
  type        = string
  default     = "1"
}

variable "allow_unauthenticated" {
  description = "Allow unauthenticated access to the service"
  type        = bool
  default     = false
}