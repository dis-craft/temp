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
import { R2Service } from '@/services/r2';

const GeneratePresignedUrlInputSchema = z.object({
  filename: z.string().describe('The name of the file to upload.'),
  contentType: z.string().describe('The MIME type of the file.'),
});
export type GeneratePresignedUrlInput = z.infer<typeof GeneratePresignedUrlInputSchema>;

const GeneratePresignedUrlOutputSchema = z.object({
  url: z.string().describe('The presigned URL for uploading the file.'),
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
    const url = await R2Service.getPresignedUrl(key, input.contentType);
    return { url, key };
  }
);
