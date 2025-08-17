const axios = require('axios');

// Sample HTML content
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Test PDF</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background-color: #f5f5f5;
        }
        h1 { 
            color: #333; 
            text-align: center;
        }
        .container {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .highlight {
            background-color: #ffffcc;
            padding: 10px;
            border-left: 4px solid #ffcc00;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>PDF Generation Test</h1>
        <p>This is a test PDF generated from HTML content using our API.</p>
        
        <div class="highlight">
            <h3>Features:</h3>
            <ul>
                <li>HTML to PDF conversion</li>
                <li>CSS styling support</li>
                <li>S3 storage integration</li>
                <li>REST API endpoint</li>
            </ul>
        </div>
        
        <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>
`;

// Convert to base64
const base64Html = Buffer.from(htmlContent).toString('base64');

async function testAPI() {
    // Replace with your actual API Gateway URL
    const apiUrl = process.env.API_URL || 'YOUR_API_GATEWAY_URL';
    
    if (apiUrl === 'YOUR_API_GATEWAY_URL') {
        console.log('❌ Please set the API_URL environment variable or update the script with your API Gateway URL');
        console.log('Example: export API_URL=https://your-api-id.execute-api.region.amazonaws.com/prod');
        return;
    }

    const payload = {
        htmlContent: base64Html,
        fileName: `test-pdf-${Date.now()}.pdf`,
        options: {
            format: 'A4',
            margin: {
                top: '1cm',
                right: '1cm',
                bottom: '1cm',
                left: '1cm'
            },
            printBackground: true
        }
    };

    try {
        console.log('🚀 Testing PDF generation API...');
        console.log(`📡 Sending request to: ${apiUrl}/generate-pdf`);
        
        const response = await axios.post(`${apiUrl}/generate-pdf`, payload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 60000 // 60 second timeout
        });

        console.log('✅ PDF generated successfully!');
        console.log('📄 File name:', response.data.fileName);
        console.log('📊 File size:', response.data.fileSize, 'bytes');
        console.log('🔗 S3 URL:', response.data.s3Url);
        
        // Test downloading the PDF
        console.log('\n📥 Testing PDF download...');
        const pdfResponse = await axios.get(response.data.s3Url, {
            responseType: 'arraybuffer'
        });
        
        console.log('✅ PDF download successful!');
        console.log('📄 Content-Type:', pdfResponse.headers['content-type']);
        console.log('📊 Downloaded size:', pdfResponse.data.length, 'bytes');
        
    } catch (error) {
        console.error('❌ Error testing API:', error.response?.data || error.message);
        
        if (error.response) {
            console.error('📊 Status:', error.response.status);
            console.error('📋 Headers:', error.response.headers);
        }
    }
}

// Run the test
testAPI(); 