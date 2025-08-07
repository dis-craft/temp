/**
 * @fileoverview This file contains the R2Service class which is responsible for interacting with Cloudflare R2 storage.
 * It handles operations like generating presigned URLs for file uploads.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;

const S3 = new S3Client({
  region: 'auto',
  endpoint: `https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export class R2Service {
  /**
   * Generates a presigned URL for uploading a file to R2.
   * @param key - The key (filename) for the object in R2.
   * @param contentType - The MIME type of the file.
   * @returns A promise that resolves to the presigned URL.
   */
  static async getPresignedUrl(key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(S3, command, { expiresIn: 3600 });
  }

  /**
   * Uploads a file buffer to R2.
   * @param key - The key (filename) for the object in R2.
   * @param body - The file content as a Buffer.
   * @param contentType - The MIME type of the file.
   * @returns A promise that resolves when the upload is complete.
   */
  static async uploadFile(key: string, body: Buffer, contentType: string) {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    await S3.send(command);
  }
}
