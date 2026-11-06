terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.5.0"
    }

    random = {
      source  = "hashicorp/random"
      version = "~> 3.9.0"
    }

    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.4.0"
    }
  }

  required_version = "~> 1.16"
}

provider "azurerm" {
  features {}

  # The benchmark service principal cannot register resource providers.
  resource_provider_registrations = "none"
}
