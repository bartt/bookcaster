import * as dotenv from 'dotenv';
dotenv.config();

import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  endpoint: process.env.S3_ENDPOINT,
  region: 'us-west-1'
});

const s3BaseConfig = {
  Bucket: 'icloud',
};

export { s3Client, s3BaseConfig };