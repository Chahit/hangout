import { supabase } from "./supabase";

const OPENAI_API_URL = "https://api.openai.com/v1/moderations";

type ModerationResponse = {
  results: [{
    categories: Record<string, boolean>;
    category_scores: Record<string, number>;
  }];
};

export async function moderateContent(
  content: string,
  contentType: string,
  contentId: string
) {
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ input: content }),
    });

    const data = (await response.json()) as ModerationResponse;
    const results = data.results[0];

    // Calculate overall moderation score
    const scores = Object.values(results.category_scores);
    const moderationScore = scores.reduce((acc, score) => acc + score, 0) / scores.length;

    // Get flagged categories
    const flaggedCategories = Object.entries(results.categories)
      .filter(([_, flagged]) => flagged)
      .map(([category]) => category);

    // Determine action based on moderation score
    let action: "flagged" | "hidden" | "deleted" = "flagged";
    if (moderationScore > 0.8) {
      action = "deleted";
    } else if (moderationScore > 0.5) {
      action = "hidden";
    }

    // Log moderation result
    const { error } = await supabase.from("moderation_logs").insert({
      content_type: contentType,
      content_id: contentId,
      content_text: content,
      moderation_score: moderationScore,
      categories: flaggedCategories,
      action_taken: action,
    });

    if (error) throw error;

    return {
      isAccepted: moderationScore < 0.5,
      action,
      score: moderationScore,
      categories: flaggedCategories,
    };
  } catch (error) {
    console.error("Moderation error:", error);
    // Default to accepting content if moderation fails
    return {
      isAccepted: true,
      action: "flagged" as const,
      score: 0,
      categories: [],
    };
  }
} 