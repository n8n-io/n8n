resource "google_cloud_run_service" "n8n" {
  name     = var.service_name
  location = var.region

  template {
    spec {
      containers {
        image = var.container_image

        ports {
          container_port = 5678
        }

        env {
          name  = "N8N_PORT"
          value = "5678"
        }

        env {
          name  = "N8N_HOST"
          value = "0.0.0.0"
        }

        env {
          name  = "N8N_PROTOCOL"
          value = "https"
        }

        env {
          name  = "NODE_ENV"
          value = var.node_env
        }

        env {
          name  = "DB_TYPE"
          value = var.db_type
        }

        env {
          name  = "DB_POSTGRESDB_HOST"
          value = var.db_host
        }

        env {
          name  = "DB_POSTGRESDB_PORT"
          value = var.db_port
        }

        env {
          name  = "DB_POSTGRESDB_DATABASE"
          value = var.db_name
        }

        env {
          name  = "DB_POSTGRESDB_USER"
          value = var.db_user
        }

        env {
          name = "DB_POSTGRESDB_PASSWORD"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.db_password.secret_id
              key  = "latest"
            }
          }
        }

        env {
          name = "N8N_ENCRYPTION_KEY"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.encryption_key.secret_id
              key  = "latest"
            }
          }
        }

        resources {
          limits = {
            cpu    = var.cpu_limit
            memory = var.memory_limit
          }
        }
      }

      service_account_name = google_service_account.n8n.email
      timeout_seconds      = var.timeout_seconds
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale"     = var.max_instances
        "autoscaling.knative.dev/minScale"     = var.min_instances
        "run.googleapis.com/cpu-throttling"     = "false"
        "run.googleapis.com/execution-environment" = "gen2"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  autogenerate_revision_name = true

  depends_on = [
    google_project_service.cloud_run_api,
    google_secret_manager_secret_version.db_password,
    google_secret_manager_secret_version.encryption_key
  ]
}

resource "google_cloud_run_service_iam_member" "public_access" {
  count    = var.allow_unauthenticated ? 1 : 0
  service  = google_cloud_run_service.n8n.name
  location = google_cloud_run_service.n8n.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_service_account" "n8n" {
  account_id   = "${var.service_name}-sa"
  display_name = "Service Account for ${var.service_name}"
  description  = "Service account for n8n Cloud Run service"
}

resource "google_project_iam_member" "secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.n8n.email}"
}

resource "google_secret_manager_secret" "db_password" {
  secret_id = "${var.service_name}-db-password"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
}

resource "google_secret_manager_secret" "encryption_key" {
  secret_id = "${var.service_name}-encryption-key"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "encryption_key" {
  secret      = google_secret_manager_secret.encryption_key.id
  secret_data = var.n8n_encryption_key
}

resource "google_project_service" "cloud_run_api" {
  project = var.project_id
  service = "run.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "secret_manager_api" {
  project = var.project_id
  service = "secretmanager.googleapis.com"

  disable_on_destroy = false
}