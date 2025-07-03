'use server';
/**
 * @fileOverview Extracts relevant metadata from user-uploaded files using AI.
 *
 * - extractMetadata - A function that extracts metadata from a file.
 * - ExtractMetadataInput - The input type for the extractMetadata function.
 * - ExtractMetadataOutput - The return type for the extractMetadata function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractMetadataInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "A file, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type ExtractMetadataInput = z.infer<typeof ExtractMetadataInputSchema>;

const ExtractMetadataOutputSchema = z.object({
  metadata: z.string().describe('The extracted metadata from the file.'),
});
export type ExtractMetadataOutput = z.infer<typeof ExtractMetadataOutputSchema>;

export async function extractMetadata(input: ExtractMetadataInput): Promise<ExtractMetadataOutput> {
  return extractMetadataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractMetadataPrompt',
  input: {schema: ExtractMetadataInputSchema},
  output: {schema: ExtractMetadataOutputSchema},
  prompt: `You are an expert metadata extractor. You will receive a file and extract the most important metadata from it, such as software requirements, version numbers, author information, dependencies, creation/modification date, etc. Return the metadata in a concise and readable format.\n\nFile: {{media url=fileDataUri}}`,
});

const extractMetadataFlow = ai.defineFlow(
  {
    name: 'extractMetadataFlow',
    inputSchema: ExtractMetadataInputSchema,
    outputSchema: ExtractMetadataOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
