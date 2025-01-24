import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const OPENAI_API_URL = "https://api.openai.com/v1/moderations";

type ModerationAction = "flagged" | "hidden" | "deleted";

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
): Promise<{
  isAccepted: boolean;
  action: ModerationAction;
  score: number;
  categories: string[];
}> {
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
    let action: ModerationAction = "flagged";
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
      action: "flagged",
      score: 0,
      categories: [],
    };
  }
}