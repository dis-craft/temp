/**
 * @fileoverview API Route for Secure File Downloads.
 * @description This is a backend (BE) Next.js dynamic API route. Its purpose is to securely
 * stream files from the private Cloudflare R2 bucket to an authenticated user.
 * 
 * It takes a `filename` from the URL path, retrieves the corresponding object from the R2
 * bucket, and then streams it back to the client with the correct `Content-Type` and
 * `Content-Disposition` headers. This approach prevents direct, public access to the files
 * in the R2 bucket, allowing for potential permission checks in the future.
 * 
 * This route is used throughout the application wherever a file needs to be downloaded,
 * such as task attachments or documentation files.
 *
 * Linked Files:
 * - `src/lib/r2.ts`: Imports the S3 client for communicating with Cloudflare R2.
 * - `src/components/dashboard/task-details-modal.tsx`: Calls this endpoint to download task attachments.
 * - `src/components/dashboard/documentation/content-display.tsx`: Calls this endpoint to download documentation files.
 *
 * Tech Used:
 * - Next.js Dynamic API Routes: The API framework.
 * - Cloudflare R2 / AWS S3 SDK: For fetching objects from cloud storage.
 * - Node.js Streams: For efficiently piping the file from R2 to the client.
 */
import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/lib/r2';
import { Readable } from 'stream';

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  const { filename } = params;

  if (!filename) {
    return NextResponse.json({ error: 'Filename is required.' }, { status: 400 });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filename,
    });

    const { Body, ContentType } = await s3Client.send(command);

    if (!Body) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }

    // Workaround for type issue with Body
    const readableStream = Body as Readable;

    const headers = new Headers();
    if (ContentType) {
      headers.set('Content-Type', ContentType);
    }
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    // In a Node.js runtime, you can convert the SDK's stream to a Web Stream
    const webStream = new ReadableStream({
      start(controller) {
        readableStream.on('data', (chunk) => controller.enqueue(chunk));
        readableStream.on('end', () => controller.close());
        readableStream.on('error', (err) => controller.error(err));
      },
    });

    return new NextResponse(webStream, { headers });

  } catch (error: any) {
    console.error('Error fetching file from R2:', error);
    // Specifically handle the case where the object does not exist
    if (error.name === 'NoSuchKey') {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
