import { createResource } from "@/lib/actions/resources";
import { findRelevantContent } from "@/lib/ai/embedding";
import { google } from "@ai-sdk/google";
import { convertToCoreMessages, streamText, tool } from "ai";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
	const { messages } = await req.json();

	try {
		const result = await streamText({
			model: google("gemini-1.5-flash"),
			system: `You are a helpful assistant. Check your knowledge base before answering any question.
			You use tool calls to check your knowledge base. Be sure to only respond with information from your tool calls.
			When responding, please phrase the information with a conversational tone.
			If no relevant information is found in the tool calls, respond, "Sorry, I don't know."`,
			messages: convertToCoreMessages(messages),
			tools: {
				addResource: tool({
					description: `add a resource to your knowledge base.
					If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.
					Don't be afraid of using this tool, it's always better to have more knowledge!`,
					parameters: z.object({
						content: z
							.string()
							.describe(
								"the content of the resource to add to the knowledge base",
							),
					}),
					execute: async ({ content }) => createResource({ content }),
				}),
				getInformation: tool({
					description: `get information from your knowledge base to answer questions.
					use this tool liberally. for any query that is a question, this tool should be used.`,
					parameters: z.object({
						question: z.string().describe("the users question"),
					}),
					execute: async ({ question }) => findRelevantContent(question),
				}),
			},
		});

		return result.toDataStreamResponse();
	} catch (err) {
		return new Response(
			JSON.stringify({
				error: err,
			}),
			{
				status: 400,
			},
		);
	}
}
