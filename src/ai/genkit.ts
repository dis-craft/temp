/**
 * @fileoverview Global Genkit Configuration.
 * @description This is a backend (BE) configuration file. It initializes and configures the
 * Genkit AI framework for the entire application.
 *
 * It creates a single, global `ai` object that is used by all other Genkit flows.
 * This file specifies which plugins to use (in this case, `@genkit-ai/googleai` for connecting
 * to Google's AI models) and sets a default model (`gemini-2.0-flash`) for all flows,
 * which can be overridden if needed.
 *
 * Centralizing this configuration makes it easy to manage plugins and default settings
 * across the application.
 *
 * Linked Files:
 * - `src/ai/flows/suggest-assignees.ts`: Imports and uses the configured `ai` object.
 *
 * Tech Used:
 * - Genkit: For AI integration.
 * - @genkit-ai/googleai: The plugin for connecting to Google AI models like Gemini.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
