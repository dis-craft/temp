/**
 * @fileoverview API Route for Secure File Uploads.
 * @description This is a backend (BE) Next.js API route that provides a secure endpoint for
 * uploading files to the Cloudflare R2 bucket.
 *
 * It requires a custom authentication key (`x-custom-auth-key`) in the request header to
 * prevent unauthorized uploads. This acts as a shared secret between the frontend and this
 * specific backend route.
 *
 * The route accepts `multipart/form-data`, extracts the file, generates a unique filename
 * using UUID to prevent name collisions, and then uploads the file buffer to the R2 bucket.
 * Upon success, it returns the unique filename (`filePath`) to the caller, which can then be
 * stored in Firestore as a reference.
 *
 * Linked Files:
 * - `src/lib/r2.ts`: Imports the S3 client for interacting with Cloudflare R2.
 * - `.env`: Requires `JWT_SECRET` (used as the auth key) and R2 credentials.
 * - Various frontend modals call this API before creating a Firestore record, e.g.,
 *   - `src/components/dashboard/create-task-modal.tsx`
 *   - `src/components/dashboard/documentation/index.tsx`
 *   - `src/components/dashboard/announcement-modal.tsx`
 *
 * Tech Used:
 * - Next.js API Routes: The API framework.
 * - Cloudflare R2 / AWS S3 SDK: For uploading objects to cloud storage.
 * - UUID: For generating unique filenames.
 */
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { s3Client } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export async function POST(req: NextRequest) {
  const authKey = req.headers.get('x-custom-auth-key');
  if (authKey !== process.env.JWT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename
    const filename = `${uuidv4()}-${file.name}`;
    
    // Upload the file to R2
    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: filename,
        Body: buffer,
        ContentType: file.type,
    }));
    
    return NextResponse.json({ success: true, filePath: filename });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
