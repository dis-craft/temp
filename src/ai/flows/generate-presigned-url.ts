'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a presigned URL for file uploads to Cloudflare R2.
 *
 * @exports generatePresignedUrl - An async function that takes a filename and content type and returns a presigned URL.
 * @exports GeneratePresignedUrlInput - The input type for the generatePresignedUrl function.
 * @exports GeneratePresignedUrlOutput - The output type for the generatePresignedUrl function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';

config(); // Load environment variables

const GeneratePresignedUrlInputSchema = z.object({
  filename: z.string().describe('The name of the file to upload.'),
  contentType: z.string().describe('The MIME type of the file.'),
  body: z.string().describe('The base64 encoded file body'),
});
export type GeneratePresignedUrlInput = z.infer<typeof GeneratePresignedUrlInputSchema>;

const GeneratePresignedUrlOutputSchema = z.object({
  key: z.string().describe('The key of the file in the R2 bucket.'),
});
export type GeneratePresignedUrlOutput = z.infer<typeof GeneratePresignedUrlOutputSchema>;

export async function generatePresignedUrl(input: GeneratePresignedUrlInput): Promise<GeneratePresignedUrlOutput> {
    return generatePresignedUrlFlow(input);
}


const generatePresignedUrlFlow = ai.defineFlow(
  {
    name: 'generatePresignedUrlFlow',
    inputSchema: GeneratePresignedUrlInputSchema,
    outputSchema: GeneratePresignedUrlOutputSchema,
  },
  async (input) => {
    const key = `${uuidv4()}-${input.filename}`;
    const fileBuffer = Buffer.from(input.body, 'base64');
    
    const workerUrl = process.env.R2_WORKER_URL;
    if (!workerUrl) {
        throw new Error('R2_WORKER_URL environment variable is not set.');
    }

    const response = await fetch(`${workerUrl}/upload`, {
        method: 'POST',
        headers: {
            'Content-Type': input.contentType,
            'X-Custom-Auth-Key': process.env.JWT_SECRET || '',
            'X-File-Key': key
        },
        body: fileBuffer,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload file to worker: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    return { key: result.key };
  }
);
