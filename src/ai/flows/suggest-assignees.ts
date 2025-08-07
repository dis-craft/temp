'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting potential assignees for a task based on its description.
 *
 * @exports suggestAssignees - An async function that takes a task description as input and returns a list of suggested assignees.
 * @exports SuggestAssigneesInput - The input type for the suggestAssignees function.
 * @exports SuggestAssigneesOutput - The output type for the suggestAssignees function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestAssigneesInputSchema = z.object({
  taskDescription: z.string().describe('The description of the task for which assignees are needed.'),
});
export type SuggestAssigneesInput = z.infer<typeof SuggestAssigneesInputSchema>;

const SuggestAssigneesOutputSchema = z.object({
  suggestedAssignees: z.array(z.string()).describe('A list of suggested assignees for the task.'),
  suggestedReminderIntervals: z.array(z.string()).describe('A list of suggested reminder intervals for the task.'),
});
export type SuggestAssigneesOutput = z.infer<typeof SuggestAssigneesOutputSchema>;

export async function suggestAssignees(input: SuggestAssigneesInput): Promise<SuggestAssigneesOutput> {
  return suggestAssigneesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAssigneesPrompt',
  input: {schema: SuggestAssigneesInputSchema},
  output: {schema: SuggestAssigneesOutputSchema},
  prompt: `You are an AI assistant helping domain leads to assign tasks to the most suitable members.
  Based on the task description provided, suggest a list of potential assignees and suggested reminder intervals.

  Task Description: {{{taskDescription}}}

  Format your response as a JSON object with "suggestedAssignees" and "suggestedReminderIntervals" keys.
  The suggestedAssignees array should contain a list of potential assignees for the task.
  The suggestedReminderIntervals array should contain a list of suggested reminder intervals for the task.
  `,
});

const suggestAssigneesFlow = ai.defineFlow({
    name: 'suggestAssigneesFlow',
    inputSchema: SuggestAssigneesInputSchema,
    outputSchema: SuggestAssigneesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
