
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
