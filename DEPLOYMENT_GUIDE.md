# Deployment Guide - S3-based PDF Generator

## 🚀 Quick Deployment Steps

### 1. Prerequisites

- AWS CLI configured with appropriate permissions
- Node.js 18+ installed
- AWS CDK CLI installed: `npm install -g aws-cdk`

### 2. Install Dependencies

```bash
npm install
```

### 3. Deploy Infrastructure

```bash
./deploy.sh
```

### 4. Get API URL

After deployment, note the API Gateway URL from the CDK output.

## 📋 Manual Deployment Steps

If you prefer to deploy manually:

### Step 1: Install Project Dependencies

```bash
npm install
```

### Step 2: Build the Project

```bash
npm run build
```

### Step 3: Install Lambda Dependencies

```bash
cd lambda && npm install && cd ..
cd lambda-layer && npm install && cd ..
```

### Step 4: Deploy with CDK

```bash
npx cdk deploy
```

## 🧪 Testing the API

### 1. Test with Sample HTML

```bash
node utils/html-to-base64.js templates/sample.html
```

### 2. Test API Endpoint

```bash
# Set your API URL
export API_URL=https://your-api-id.execute-api.region.amazonaws.com/prod

# Run the test
node test-api.js
```

### 3. Test with cURL

```bash
curl -X POST \
  https://your-api-id.execute-api.region.amazonaws.com/prod/generate-pdf \
  -H 'Content-Type: application/json' \
  -d @sample-payload.json
```

## 📊 Expected Output

After successful deployment, you should see:

- API Gateway URL
- S3 Bucket name
- Lambda function ARN

## 🔧 Configuration Options

### Lambda Settings (in `lib/s3-based-pdf-generator-stack.ts`)

- **Memory**: 1024 MB (increase for complex PDFs)
- **Timeout**: 30 seconds (increase for large documents)
- **Runtime**: Node.js 18.x

### PDF Options

- **Format**: A4, Letter, Legal
- **Margins**: Customizable top, right, bottom, left
- **Background**: Include/exclude background colors

## 🐛 Troubleshooting

### Common Issues

1. **Deployment Fails**

   - Check AWS credentials: `aws sts get-caller-identity`
   - Verify CDK bootstrap: `npx cdk bootstrap`

2. **Lambda Timeout**

   - Increase timeout in CDK stack
   - Check CloudWatch logs for errors

3. **PDF Generation Fails**

   - Verify HTML content is valid base64
   - Check Lambda memory allocation
   - Review CloudWatch logs

4. **S3 Upload Fails**
   - Verify IAM permissions
   - Check bucket name and region

### Useful Commands

```bash
# Check CDK status
npx cdk list

# View CloudFormation stack
aws cloudformation describe-stacks --stack-name S3BasedPdfGeneratorStack

# Check Lambda logs
aws logs tail /aws/lambda/S3BasedPdfGeneratorStack-PdfGeneratorFunction-XXXXX --follow

# Test Lambda locally (requires SAM)
sam local invoke PdfGeneratorFunction -e events/test-event.json
```

## 🧹 Cleanup

To remove all deployed resources:

```bash
npx cdk destroy
```

## 📝 Notes

- The S3 bucket is configured for public read access
- PDFs are versioned for data protection
- CORS is enabled for web applications
- The API includes proper error handling and CORS headers

## 🔒 Security Considerations

For production use, consider:

- Adding API Gateway authentication
- Implementing rate limiting
- Using CloudFront for PDF delivery
- Restricting S3 bucket access
- Adding request validation
