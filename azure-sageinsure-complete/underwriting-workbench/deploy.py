#!/usr/bin/env python3

import subprocess
import sys
import os

def run_command(command, cwd=None):
    """Run shell command and return result"""
    try:
        result = subprocess.run(command, shell=True, cwd=cwd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"❌ Error: {result.stderr}")
            return False
        print(result.stdout)
        return True
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

def main():
    print("🏢 Deploying SageInsure Next.js Underwriting Workbench to Azure")
    print("=" * 70)
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Step 1: Install dependencies and build
    print("\n📦 Installing dependencies...")
    if not run_command("npm install", current_dir):
        print("❌ Failed to install dependencies")
        return False
    
    print("\n🔨 Building Next.js application...")
    if not run_command("npm run build", current_dir):
        print("❌ Failed to build application")
        return False
    
    # Step 2: Build and push Docker image
    print("\n📦 Building Docker image...")
    if not run_command("docker buildx build --platform linux/amd64,linux/arm64 -t sageinsureacr.azurecr.io/nextjs-underwriting-workbench:latest --push .", current_dir):
        print("❌ Failed to build and push Docker image")
        return False
    
    # Step 3: Create ACR secret in new namespace
    print("\n🔐 Creating ACR secret...")
    acr_password_cmd = "az acr credential show --name sageinsureacr --query \"passwords[0].value\" -o tsv"
    result = subprocess.run(acr_password_cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print("❌ Failed to get ACR password")
        return False
    
    acr_password = result.stdout.strip()
    
    # Create namespace first
    run_command("kubectl create namespace sageinsure-nextjs-workbench --dry-run=client -o yaml | kubectl apply -f -")
    
    # Create ACR secret
    secret_cmd = f"""kubectl create secret docker-registry acr-secret \
        --docker-server=sageinsureacr.azurecr.io \
        --docker-username=sageinsureacr \
        --docker-password={acr_password} \
        --namespace=sageinsure-nextjs-workbench \
        --dry-run=client -o yaml | kubectl apply -f -"""
    
    if not run_command(secret_cmd):
        print("❌ Failed to create ACR secret")
        return False
    
    # Step 4: Deploy to Kubernetes
    print("\n🚀 Deploying to Kubernetes...")
    if not run_command(f"kubectl apply -f {os.path.join(current_dir, 'k8s-deployment.yaml')}"):
        print("❌ Failed to deploy to Kubernetes")
        return False
    
    # Step 5: Wait for deployment
    print("\n⏳ Waiting for deployment to be ready...")
    if not run_command("kubectl wait --for=condition=available --timeout=300s deployment/nextjs-underwriting-workbench -n sageinsure-nextjs-workbench"):
        print("❌ Deployment failed to become ready")
        return False
    
    # Step 6: Get service information
    print("\n📋 Getting service information...")
    run_command("kubectl get service nextjs-underwriting-workbench-service -n sageinsure-nextjs-workbench")
    run_command("kubectl get pods -n sageinsure-nextjs-workbench")
    
    print("\n✅ Next.js Underwriting Workbench deployed successfully!")
    print("\n📊 Access your workbench:")
    print("   • Check service external IP: kubectl get svc -n sageinsure-nextjs-workbench")
    print("   • View logs: kubectl logs -f deployment/nextjs-underwriting-workbench -n sageinsure-nextjs-workbench")
    
    return True

if __name__ == "__main__":
    if main():
        sys.exit(0)
    else:
        sys.exit(1)