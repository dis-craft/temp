/**
 * @fileoverview Genkit Development Server Entry Point.
 * @description This is a backend (BE) file used exclusively for local development of Genkit flows.
 * It's the entry point for the Genkit developer UI, which allows for testing and debugging AI flows.
 * This file is executed by the `genkit:dev` and `genkit:watch` npm scripts.
 * 
 * It imports `dotenv` to load environment variables from the `.env` file and then imports the
 * Genkit flow(s) that need to be available in the development environment.
 * 
 * Linked Files:
 * - `.env`: Loads environment variables from this file.
 * - `src/ai/flows/suggest-assignees.ts`: Imports and registers the Genkit flow for the dev server.
 * 
 * Tech Used:
 * - Genkit: For AI flow development.
 * - dotenv: For loading environment variables.
 * - tsx: Used in `package.json` to execute this TypeScript file directly.
 */
import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-assignees.ts';
