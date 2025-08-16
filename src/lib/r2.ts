/**
 * @fileoverview Cloudflare R2 Client Configuration.
 * @description This is a backend (BE) configuration file that initializes and exports a client
 * for interacting with a Cloudflare R2 storage bucket.
 *
 * How it works:
 * - It uses the `@aws-sdk/client-s3` library, which is compatible with R2's S3-compatible API.
 * - It reads R2 credentials (endpoint, access key, secret key) from environment variables.
 * - It throws an error if these environment variables are not set, preventing the application
 *   from running without proper configuration.
 * - It exports a single `s3Client` instance that can be imported and used by API routes
 *   to perform operations like uploading (`PutObjectCommand`) or downloading (`GetObjectCommand`) files.
 *
 * This centralized client ensures consistent configuration for all R2 interactions.
 *
 * Linked Files:
 * - `.env`: This file must contain `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY`.
 * - `src/app/api/upload/route.ts`: Imports and uses `s3Client` to upload files.
 * - `src/app/api/download/[filename]/route.ts`: Imports and uses `s3Client` to fetch files.
 * - `src/app/api/documentation/route.ts`: Imports and uses `s3Client` to delete files.
 *
 * Tech Used:
 * - AWS SDK for JavaScript v3 (`@aws-sdk/client-s3`): The library for S3 API interaction.
 * - Cloudflare R2: The object storage service being used.
 */
import { S3Client } from '@aws-sdk/client-s3';

if (
  !process.env.R2_ENDPOINT ||
  !process.env.R2_ACCESS_KEY_ID ||
  !process.env.R2_SECRET_ACCESS_KEY
) {
  throw new Error('Missing R2 environment variables');
}

export const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
