import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { randomUUID } from "crypto";

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.BUCKET_NAME!;
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL;

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
    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Missing request body",
        }),
      };
    }

    const body = JSON.parse(event.body);
    const { htmlContent, fileName } = body;

    if (!htmlContent) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Missing htmlContent in request body",
        }),
      };
    }

    // Decode base64 HTML content
    let html = Buffer.from(htmlContent, "base64").toString("utf-8");

    // Inject Hindi font CSS to ensure proper rendering
    const fontCSS = `
      <style>
        @font-face {
          font-family: 'Noto Sans Devanagari';
          src: url('https://numeriisoft.com/assets/NotoSansDevanagari-Bold.ttf') format('truetype');
          font-weight: bold;
          font-style: normal;
          font-display: swap;
        }
        * {
          font-family: 'Noto Sans Devanagari', 'Arial Unicode MS', Arial, sans-serif !important;
        }
        body {
          font-family: 'Noto Sans Devanagari', 'Arial Unicode MS', Arial, sans-serif !important;
        }
      </style>
    `;

    // Insert font CSS in the head section
    if (html.includes("<head>")) {
      html = html.replace("<head>", `<head>${fontCSS}`);
    } else if (html.includes("</head>")) {
      html = html.replace("</head>", `${fontCSS}</head>`);
    } else {
      // If no head tag, add it at the beginning
      html = `<head>${fontCSS}</head>${html}`;
    }

    // Generate unique filename with UUID
    const uuid = randomUUID();
    const finalFileName = fileName
      ? fileName.replace(/\.pdf$/i, "") + "-" + uuid + ".pdf"
      : `${uuid}.pdf`;

    console.log("Starting PDF generation...");
    const startTime = Date.now();

    // Launch browser with optimized settings for performance and font support
    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-zygote",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
        "--disable-extensions",
        "--disable-plugins",
        "--enable-fonts",
        "--enable-images",
        "--font-render-hinting=none",
        "--disable-font-subpixel-positioning",
        "--disable-web-security",
        "--memory-pressure-off",
        "--max_old_space_size=2048",
        "--disable-features=VizDisplayCompositor",
      ],
      defaultViewport: {
        width: 1200,
        height: 800,
      },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless === true,
    });

    try {
      const page = await browser.newPage();

      // Set content with timeout and font support
      await page.setContent(html, {
        waitUntil: "networkidle0",
        timeout: 60000,
      });

      // Wait for fonts to load, especially for Hindi text
      await page.evaluate(() => {
        return document.fonts.ready;
      });

      // Additional wait to ensure fonts are fully loaded
      await page.waitForTimeout(2000);

      console.log("Content loaded, generating PDF...");

      // Generate PDF with optimized settings
      const pdfBuffer = await page.pdf({
        format: "a4",
        printBackground: true,
        margin: {
          top: "0.5in",
          right: "0.5in",
          bottom: "0.5in",
          left: "0.5in",
        },
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        timeout: 120000,
      });

      console.log(
        `PDF generated in ${Date.now() - startTime}ms, size: ${
          pdfBuffer.length
        } bytes`
      );

      // Upload to S3
      const uploadCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: finalFileName,
        Body: pdfBuffer,
        ContentType: "application/pdf",
        ContentDisposition: `inline; filename="${finalFileName}"`,
        CacheControl: "public, max-age=3600",
      });

      await s3Client.send(uploadCommand);
      console.log("PDF uploaded to S3 successfully");

      const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${finalFileName}`;
      const cloudfrontUrl = CLOUDFRONT_URL
        ? `https://${CLOUDFRONT_URL}/${finalFileName}`
        : null;

      const totalTime = Date.now() - startTime;
      console.log(`Total processing time: ${totalTime}ms`);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: "PDF generated successfully",
          fileName: finalFileName,
          uuid: uuid,
          s3Url: s3Url,
          cloudfrontUrl: cloudfrontUrl,
          fileSize: pdfBuffer.length,
          downloadUrl: cloudfrontUrl || s3Url,
          processingTimeMs: totalTime,
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
