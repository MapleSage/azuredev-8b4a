#!/bin/bash

# Deploy Frontend to AKS
echo "🚀 Deploying SageInsure Frontend to AKS..."

# Build and push frontend container
cd azure-azins-frontend

# Build Next.js app
echo "📦 Building Next.js application..."
npm run build

# Create Dockerfile for production
cat > Dockerfile << 'EOF'
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=base /app/node_modules ./node_modules
COPY --from=build --chown=nextjs:nodejs /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["npm", "start"]
EOF

# Build and push container
echo "🐳 Building frontend container..."
docker build -t sageinsureacr1758906383.azurecr.io/sageinsure-frontend:latest .
docker push sageinsureacr1758906383.azurecr.io/sageinsure-frontend:latest

cd ..

# Create Kubernetes manifests
cat > k8s-manifests/frontend-deployment.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sageinsure-frontend
  namespace: sageinsure-agents
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sageinsure-frontend
  template:
    metadata:
      labels:
        app: sageinsure-frontend
    spec:
      containers:
      - name: frontend
        image: sageinsureacr1758906383.azurecr.io/sageinsure-frontend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_API_BASE_URL
          value: "https://agents.maplesage.com"
        - name: NEXT_PUBLIC_BACKEND_URL
          value: "https://agents.maplesage.com"
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: sageinsure-frontend-service
  namespace: sageinsure-agents
spec:
  selector:
    app: sageinsure-frontend
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
EOF

# Update ingress to include frontend
cat > k8s-manifests/complete-ingress.yaml << 'EOF'
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sageinsure-complete-ingress
  namespace: sageinsure-agents
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
spec:
  rules:
  - host: agents.maplesage.com
    http:
      paths:
      - path: /()(.*)
        pathType: Prefix
        backend:
          service:
            name: sageinsure-frontend-service
            port:
              number: 80
      - path: /(api|chat)(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: backend-proxy
            port:
              number: 80
EOF

# Deploy to AKS
echo "☸️ Deploying to AKS..."
kubectl apply -f k8s-manifests/frontend-deployment.yaml
kubectl apply -f k8s-manifests/complete-ingress.yaml

# Wait for deployment
echo "⏳ Waiting for frontend deployment..."
kubectl rollout status deployment/sageinsure-frontend -n sageinsure-agents

echo "✅ Frontend deployed successfully!"
echo "🌐 Access your application at: https://agents.maplesage.com"