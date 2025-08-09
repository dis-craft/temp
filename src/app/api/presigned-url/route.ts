import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || '',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(req: NextRequest) {
  try {
    const { filename, contentType, action = 'upload' } = await req.json();

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required.' }, { status: 400 });
    }
    
    let command;
    if (action === 'download') {
        command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: filename,
        });
    } else { // 'upload'
        if (!contentType) {
            return NextResponse.json({ error: 'Content type is required for uploads.' }, { status: 400 });
        }
        command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: filename,
            ContentType: contentType,
        });
    }

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour

    return NextResponse.json({ url, key: filename });

  } catch (error) {
    console.error('Error creating presigned URL:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
