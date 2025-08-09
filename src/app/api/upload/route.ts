// IMPORTANT: This file is used to upload files to Cloudflare R2 via a worker.
// It is a standard Next.js API route.

import {NextRequest, NextResponse} from 'next/server';
import {v4 as uuidv4} from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({error: 'No file provided.'}, {status: 400});
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    // Encode the filename to handle special characters safely
    const key = `${uuidv4()}-${encodeURIComponent(file.name)}`;
    const workerUrl = process.env.NEXT_PUBLIC_R2_WORKER_URL;

    if (!workerUrl) {
      console.error('NEXT_PUBLIC_R2_WORKER_URL is not set.');
      return NextResponse.json(
        {error: 'Server configuration error.'},
        {status: 500}
      );
    }
    
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': file.type,
        'X-Custom-Auth-Key': process.env.JWT_SECRET || '',
        'X-File-Key': key,
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Failed to upload file to worker: ${response.status} ${response.statusText} - ${errorText}`
      );
      return NextResponse.json(
        {error: `Worker error: ${errorText}`},
        {status: response.status}
      );
    }

    const result = await response.json();

    return NextResponse.json({key: result.key}, {status: 200});
  } catch (error) {
    console.error('Error in upload API route:', error);
    return NextResponse.json(
      {error: 'Internal Server Error'},
      {status: 500}
    );
  }
}
