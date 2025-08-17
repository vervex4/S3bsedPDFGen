#!/bin/bash

# Exit on any error
set -e

echo "🚀 Starting deployment of S3-based PDF Generator..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building the project..."
npm run build

# Install Lambda dependencies
echo "📦 Installing Lambda dependencies..."
cd lambda && npm install && cd ..
cd lambda-layer && npm install && cd ..

# Deploy with CDK
echo "🚀 Deploying to AWS..."
npx cdk deploy --require-approval never

echo "✅ Deployment completed successfully!"
echo "📋 Check the outputs above for the API Gateway URL and S3 bucket name." 