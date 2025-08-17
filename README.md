# S3-based PDF Generator

A REST API that converts base64 HTML content to PDF using AWS Lambda with Puppeteer and stores the generated PDFs in S3.

## 🏗️ Architecture

- **API Gateway**: REST API endpoint for receiving requests
- **Lambda Function**: TypeScript-based function that converts HTML to PDF using Puppeteer
- **S3 Bucket**: Stores generated PDFs with public read access
- **Lambda Layer**: Contains Puppeteer and Chromium dependencies

## 🚀 Quick Start

### Prerequisites

- AWS CLI configured with appropriate permissions
- Node.js 18+ installed
- AWS CDK CLI installed (`npm install -g aws-cdk`)

### Deployment

1. **Clone and navigate to the project:**
   ```bash
   cd S3bsedPDFGen
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Deploy the infrastructure:**
   ```bash
   ./deploy.sh
   ```

   Or manually:
   ```bash
   npm install
   npm run build
   cd lambda && npm install && cd ..
   cd lambda-layer && npm install && cd ..
   npx cdk deploy
   ```

4. **Note the API Gateway URL** from the deployment output.

## 📋 API Documentation

### Endpoint
`POST /generate-pdf`

### Request Body
```json
{
  "htmlContent": "base64-encoded-html-content",
  "fileName": "optional-custom-filename.pdf",
  "options": {
    "format": "A4",
    "margin": {
      "top": "1cm",
      "right": "1cm", 
      "bottom": "1cm",
      "left": "1cm"
    },
    "printBackground": true
  }
}
```

### Response
```json
{
  "success": true,
  "message": "PDF generated successfully",
  "fileName": "pdf-1234567890.pdf",
  "s3Url": "https://bucket-name.s3.region.amazonaws.com/pdf-1234567890.pdf",
  "fileSize": 12345
}
```

## 💻 Usage Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Sample PDF</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <h1>Hello World!</h1>
    <p>This is a sample PDF generated from HTML.</p>
</body>
</html>
`;

const base64Html = Buffer.from(htmlContent).toString('base64');

async function generatePDF() {
  try {
    const response = await axios.post('YOUR_API_GATEWAY_URL/generate-pdf', {
      htmlContent: base64Html,
      fileName: 'sample-document.pdf',
      options: {
        format: 'A4',
        printBackground: true
      }
    });
    
    console.log('PDF URL:', response.data.s3Url);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

generatePDF();
```

### Python
```python
import requests
import base64

html_content = """
<!DOCTYPE html>
<html>
<head>
    <title>Sample PDF</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <h1>Hello World!</h1>
    <p>This is a sample PDF generated from HTML.</p>
</body>
</html>
"""

base64_html = base64.b64encode(html_content.encode()).decode()

payload = {
    "htmlContent": base64_html,
    "fileName": "sample-document.pdf",
    "options": {
        "format": "A4",
        "printBackground": True
    }
}

response = requests.post('YOUR_API_GATEWAY_URL/generate-pdf', json=payload)
print('PDF URL:', response.json()['s3Url'])
```

### cURL
```bash
curl -X POST \
  https://YOUR_API_GATEWAY_URL/generate-pdf \
  -H 'Content-Type: application/json' \
  -d '{
    "htmlContent": "PCFET0NUWVBFIGh0bWw+CjxodG1sPgo8aGVhZD4KICAgIDx0aXRsZT5TYW1wbGUgUERGPC90aXRsZT4KPC9oZWFkPgo8Ym9keT4KICAgIDxoMT5IZWxsbyBXb3JsZCE8L2gxPgogICAgPHA+VGhpcyBpcyBhIHNhbXBsZSBQREYuPC9wPgo8L2JvZHk+CjwvaHRtbD4=",
    "fileName": "sample.pdf"
  }'
```

## 🔧 Configuration Options

### PDF Options
- **format**: `A4`, `Letter`, `Legal`
- **margin**: Object with `top`, `right`, `bottom`, `left` properties
- **printBackground**: Boolean to include background colors/images

### Lambda Configuration
- **Memory**: 1024 MB (configurable in CDK stack)
- **Timeout**: 30 seconds (configurable in CDK stack)
- **Runtime**: Node.js 18.x

## 🛠️ Development

### Local Testing
```bash
# Install dependencies
npm install

# Build the project
npm run build

# Test the Lambda function locally (requires AWS SAM)
sam local invoke PdfGeneratorFunction -e events/test-event.json
```

### Updating Dependencies
```bash
# Update Lambda layer dependencies
cd lambda-layer && npm update && cd ..

# Update Lambda function dependencies  
cd lambda && npm update && cd ..

# Redeploy
npx cdk deploy
```

## 🧹 Cleanup

To remove all deployed resources:
```bash
npx cdk destroy
```

## 📝 Notes

- The S3 bucket is configured with CORS to allow cross-origin requests
- PDFs are stored with public read access for easy retrieval
- The Lambda function uses Puppeteer with Chromium for PDF generation
- All generated PDFs are versioned in S3
- The API includes proper CORS headers for web applications

## 🔒 Security Considerations

- Consider adding authentication/authorization to the API Gateway
- Implement rate limiting for production use
- Review S3 bucket permissions for your specific use case
- Consider using CloudFront for PDF delivery with custom domains

## 🐛 Troubleshooting

### Common Issues

1. **Lambda timeout**: Increase the timeout in the CDK stack
2. **Memory issues**: Increase Lambda memory allocation
3. **PDF generation fails**: Check that HTML content is valid base64
4. **S3 upload fails**: Verify IAM permissions

### Logs
Check CloudWatch logs for the Lambda function to debug issues:
```bash
aws logs tail /aws/lambda/S3BasedPdfGeneratorStack-PdfGeneratorFunction-XXXXX --follow
``` 