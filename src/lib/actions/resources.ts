"use server";

import { generateEmbeddings } from "@/lib/ai/embedding";
import { db } from "@/lib/db";
import {
	insertResourceSchema,
	resources,
	type NewResourceParams,
} from "@/lib/db/schema/resources";
import { embeddings as embeddingsTable } from "@/lib/db/schema/embeddings";

export const createResource = async (input: NewResourceParams) => {
	try {
		const { content } = insertResourceSchema.parse(input);

		const [resource] = await db
			.insert(resources)
			.values({ content })
			.returning();

		const embeddings = await generateEmbeddings(content);
		await db.insert(embeddingsTable).values(
			embeddings.map((embedding) => ({
				resourceId: resource.id,
				...embedding,
			})),
		);

		return {
			message: "Resource successfully created and embedded",
			success: true,
		};
	} catch (error) {
		return {
			success: false,
			error: (error as Error)?.message || "Error, please try again",
		};
	}
};
