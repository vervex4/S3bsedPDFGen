import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { randomUUID } from "crypto";

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.BUCKET_NAME!;
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL;

interface RequestBody {
  htmlContent: string; // base64 encoded HTML
  fileName?: string;
  options?: {
    format?: "A4" | "Letter" | "Legal";
    margin?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
    printBackground?: boolean;
  };
}

// CORS headers for all responses
const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400",
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  try {
    console.log("Event received:", JSON.stringify(event, null, 2));

    // Parse request body
    const body: RequestBody = JSON.parse(event.body || "{}");

    if (!body.htmlContent) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "htmlContent is required in base64 format",
        }),
      };
    }

    // Decode base64 HTML content
    const htmlContent = Buffer.from(body.htmlContent, "base64").toString(
      "utf-8"
    );

    // Generate unique filename with UUID
    const uuid = randomUUID();
    const fileName = body.fileName
      ? body.fileName.replace(/\.pdf$/i, "") + "-" + uuid + ".pdf"
      : `${uuid}.pdf`;

    // Launch browser
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    try {
      // Create new page
      const page = await browser.newPage();

      // Set content and wait for it to load
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      // Configure PDF options
      const pdfOptions = {
        format: body.options?.format || "A4",
        margin: body.options?.margin || {
          top: "1cm",
          right: "1cm",
          bottom: "1cm",
          left: "1cm",
        },
        printBackground: body.options?.printBackground !== false,
      };

      // Generate PDF
      const pdfBuffer = await page.pdf(pdfOptions);

      // Upload to S3
      const uploadCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: pdfBuffer,
        ContentType: "application/pdf",
        ContentDisposition: `attachment; filename="${fileName}"`,
      });

      await s3Client.send(uploadCommand);

      // Generate URLs
      const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
      const cloudfrontUrl = CLOUDFRONT_URL
        ? `https://${CLOUDFRONT_URL}/${fileName}`
        : null;

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: "PDF generated successfully",
          fileName: fileName,
          uuid: uuid,
          s3Url: s3Url,
          cloudfrontUrl: cloudfrontUrl,
          fileSize: pdfBuffer.length,
          downloadUrl: cloudfrontUrl || s3Url, // Prefer CloudFront if available
        }),
      };
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("Error generating PDF:", error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
