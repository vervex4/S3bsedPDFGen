import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export class S3BasedPdfGeneratorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 bucket for storing PDFs
    const pdfBucket = new s3.Bucket(this, "PdfBucket", {
      bucketName: `pdf-generator-${this.account}-${this.region}`,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      publicReadAccess: true, // Allow public read access
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: [
            "*",
            "http://localhost:4200",
            "http://localhost:3000",
            "http://localhost:8080",
            "https://localhost:4200",
            "https://localhost:3000",
            "https://localhost:8080",
          ],
          allowedHeaders: [
            "*",
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "Accept",
            "Origin",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers",
          ],
          exposedHeaders: [
            "ETag",
            "Content-Length",
            "Content-Type",
            "Content-Disposition",
          ],
          maxAge: 3000,
        },
      ],
    });

    // Create CloudFront distribution for secure PDF access
    const distribution = new cloudfront.Distribution(this, "PdfDistribution", {
      defaultBehavior: {
        origin: new origins.S3Origin(pdfBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: new cloudfront.ResponseHeadersPolicy(
          this,
          "CorsPolicy",
          {
            responseHeadersPolicyName: "CORS-Policy",
            corsBehavior: {
              accessControlAllowCredentials: false,
              accessControlAllowHeaders: ["*"],
              accessControlAllowMethods: ["GET", "HEAD", "OPTIONS"],
              accessControlAllowOrigins: ["*"],
              accessControlExposeHeaders: [
                "ETag",
                "Content-Length",
                "Content-Type",
                "Content-Disposition",
              ],
              accessControlMaxAge: cdk.Duration.seconds(86400),
              originOverride: true,
            },
          }
        ),
      },
      defaultRootObject: "index.html",
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
      ],
    });

    // Create Lambda layer for Puppeteer dependencies
    const puppeteerLayer = new lambda.LayerVersion(this, "PuppeteerLayer", {
      code: lambda.Code.fromAsset("lambda-layer"),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: "Puppeteer dependencies for PDF generation",
    });

    // Create Lambda function
    const pdfGeneratorFunction = new lambda.Function(
      this,
      "PdfGeneratorFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "dist/index.handler",
        code: lambda.Code.fromAsset("lambda"),
        timeout: cdk.Duration.seconds(300), // Increased to 5 minutes
        memorySize: 3072, // Increased to 3GB for better performance
        environment: {
          BUCKET_NAME: pdfBucket.bucketName,
          CLOUDFRONT_URL: distribution.distributionDomainName,
        },
        layers: [puppeteerLayer],
      }
    );

    // Grant S3 permissions to Lambda
    pdfBucket.grantWrite(pdfGeneratorFunction);
    pdfBucket.grantRead(pdfGeneratorFunction);

    // Create API Gateway with comprehensive CORS
    const api = new apigateway.RestApi(this, "PdfGeneratorApi", {
      restApiName: "PDF Generator Service",
      description: "API for converting HTML to PDF",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "X-Amz-Security-Token",
          "X-Requested-With",
          "Accept",
          "Origin",
        ],
        allowCredentials: true,
        maxAge: cdk.Duration.seconds(86400),
      },
    });

    // Create API Gateway integration
    const integration = new apigateway.LambdaIntegration(pdfGeneratorFunction, {
      requestTemplates: {
        "application/json": '{ "statusCode": "200" }',
      },
    });

    // Add resource and method
    const pdfResource = api.root.addResource("generate-pdf");
    pdfResource.addMethod("POST", integration);

    // Output the API URL
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway URL",
    });

    new cdk.CfnOutput(this, "BucketName", {
      value: pdfBucket.bucketName,
      description: "S3 Bucket for PDFs",
    });

    new cdk.CfnOutput(this, "CloudFrontUrl", {
      value: `https://${distribution.distributionDomainName}`,
      description: "CloudFront Distribution URL",
    });
  }
}
