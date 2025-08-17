#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { S3BasedPdfGeneratorStack } from '../lib/s3-based-pdf-generator-stack';

const app = new cdk.App();
new S3BasedPdfGeneratorStack(app, 'S3BasedPdfGeneratorStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
}); 