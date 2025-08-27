# Platform Add-ons Module Outputs

output "nginx_ingress_namespace" {
  description = "Namespace where NGINX ingress controller is deployed"
  value       = var.enable_nginx_ingress ? kubernetes_namespace.ingress_nginx[0].metadata[0].name : null
}

output "cert_manager_namespace" {
  description = "Namespace where cert-manager is deployed"
  value       = var.enable_cert_manager ? kubernetes_namespace.cert_manager[0].metadata[0].name : null
}

output "nginx_ingress_class_name" {
  description = "Name of the NGINX ingress class"
  value       = var.ingress_class_name
}

output "letsencrypt_issuer_name" {
  description = "Name of the Let's Encrypt production issuer"
  value       = var.enable_cert_manager && var.acme_email != "" ? "letsencrypt-prod" : null
}

output "letsencrypt_staging_issuer_name" {
  description = "Name of the Let's Encrypt staging issuer"
  value       = var.enable_cert_manager && var.acme_email != "" ? "letsencrypt-staging" : null
}

output "nginx_ingress_controller_service" {
  description = "Service name of the NGINX ingress controller"
  value       = var.enable_nginx_ingress ? "ingress-nginx-controller" : null
}

output "platform_addons_ready" {
  description = "Indicates if platform add-ons are deployed"
  value = {
    nginx_ingress = var.enable_nginx_ingress
    cert_manager  = var.enable_cert_manager
  }
}