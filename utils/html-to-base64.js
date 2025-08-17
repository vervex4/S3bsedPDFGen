#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function convertHtmlToBase64(filePath) {
  try {
    // Read the HTML file
    const htmlContent = fs.readFileSync(filePath, "utf8");

    // Convert to base64
    const base64Content = Buffer.from(htmlContent).toString("base64");

    // Create the JSON payload
    const payload = {
      htmlContent: base64Content,
      fileName: path.basename(filePath, ".html") + ".pdf",
      options: {
        format: "A4",
        margin: {
          top: "1cm",
          right: "1cm",
          bottom: "1cm",
          left: "1cm",
        },
        printBackground: true,
      },
    };

    // Output the JSON payload
    console.log("JSON Payload for API:");
    console.log(JSON.stringify(payload, null, 2));

    // Save to file
    const outputFile = path.basename(filePath, ".html") + "-payload.json";
    fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2));
    console.log(`\nPayload saved to: ${outputFile}`);

    return payload;
  } catch (error) {
    console.error("Error converting HTML to base64:", error.message);
    process.exit(1);
  }
}

// Check if file path is provided
if (process.argv.length < 3) {
  console.log("Usage: node html-to-base64.js <path-to-html-file>");
  console.log("Example: node html-to-base64.js templates/sample.html");
  process.exit(1);
}

const htmlFile = process.argv[2];

// Check if file exists
if (!fs.existsSync(htmlFile)) {
  console.error(`Error: File '${htmlFile}' not found`);
  process.exit(1);
}

// Convert the HTML file
convertHtmlToBase64(htmlFile);
