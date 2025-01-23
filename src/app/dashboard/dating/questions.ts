export const DATING_QUESTIONS = [
  {
    id: 1,
    question: "What's your ideal weekend activity?",
    options: ["Reading", "Gaming", "Sports", "Movies", "Traveling", "Cooking", "Music", "Art", "Shopping", "Hiking"]
  },
  {
    id: 2,
    question: "How do you prefer to communicate?",
    options: ["Texting", "Calling", "InPerson", "Email", "VideoChat", "Letters", "Voice Messages"]
  },
  {
    id: 3,
    question: "What's your preferred music genre?",
    options: ["Pop", "Rock", "HipHop", "Classical", "Jazz", "Electronic", "Folk", "Metal", "RnB", "Country"]
  },
  {
    id: 4,
    question: "How do you handle stress?",
    options: ["Exercise", "Meditation", "Sleep", "Talk", "Write", "Music", "Nature", "Food", "Games", "Work"]
  },
  {
    id: 5,
    question: "What's your ideal date?",
    options: ["Dinner", "Movies", "Adventure", "Concert", "Museum", "Park", "Beach", "Cafe", "Sports", "Cooking"]
  },
  {
    id: 6,
    question: "How do you make decisions?",
    options: ["Logical", "Emotional", "Intuitive", "Analytical", "Cautious", "Quick", "Collaborative"]
  },
  {
    id: 7,
    question: "What's your love language?",
    options: ["Touch", "Words", "Gifts", "Time", "Acts", "All"]
  },
  {
    id: 8,
    question: "What's your ideal living environment?",
    options: ["City", "Suburb", "Rural", "Beach", "Mountain", "Forest", "Island", "Desert"]
  },
  {
    id: 9,
    question: "How do you view success?",
    options: ["Wealth", "Impact", "Freedom", "Knowledge", "Fame", "Power", "Balance", "Happiness"]
  },
  {
    id: 10,
    question: "What's your preferred social setting?",
    options: ["Parties", "SmallGroups", "OneOnOne", "Alone", "Family", "Crowds", "Nature", "Online"]
  },
  {
    id: 11,
    question: "How do you approach problems?",
    options: ["Creative", "Systematic", "Collaborative", "Independent", "Cautious", "Bold", "Analytical"]
  },
  {
    id: 12,
    question: "What's your ideal pet?",
    options: ["Dog", "Cat", "Bird", "Fish", "Reptile", "None", "Multiple", "Exotic"]
  },
  {
    id: 13,
    question: "How do you prefer to learn?",
    options: ["Reading", "Watching", "Doing", "Teaching", "Discussion", "Writing", "Experience"]
  },
  {
    id: 14,
    question: "What's your preferred cuisine?",
    options: ["Indian", "Italian", "Chinese", "Japanese", "Mexican", "Thai", "French", "American", "Mediterranean"]
  },
  {
    id: 15,
    question: "How do you spend your free time?",
    options: ["Learning", "Creating", "Relaxing", "Socializing", "Exercise", "Entertainment", "Nature", "Hobbies"]
  },
  {
    id: 16,
    question: "What's your ideal career field?",
    options: ["Technology", "Arts", "Science", "Business", "Healthcare", "Education", "Sports", "Media"]
  },
  {
    id: 17,
    question: "How do you express emotions?",
    options: ["Openly", "Reserved", "Actions", "Words", "Art", "Music", "Writing", "Rarely"]
  },
  {
    id: 18,
    question: "What's your preferred season?",
    options: ["Spring", "Summer", "Fall", "Winter"]
  },
  {
    id: 19,
    question: "How do you approach relationships?",
    options: ["Casual", "Serious", "Friendship", "Traditional", "Modern", "Spontaneous", "Planned"]
  },
  {
    id: 20,
    question: "What's your ideal vacation?",
    options: ["Beach", "Mountains", "City", "Cruise", "Camping", "Resort", "RoadTrip", "Staycation"]
  }
] as const;

// Matching algorithm weights for different question categories
export const QUESTION_WEIGHTS = {
  // Core values and lifestyle (higher weight)
  4: 2.0,  // stress handling
  6: 2.0,  // decision making
  7: 2.0,  // love language
  9: 2.0,  // view of success
  17: 2.0, // emotional expression
  19: 2.0, // relationship approach

  // Personal interests (medium weight)
  1: 1.5,  // weekend activity
  3: 1.5,  // music
  5: 1.5,  // ideal date
  15: 1.5, // free time

  // General preferences (normal weight)
  2: 1.0,  // communication
  8: 1.0,  // living environment
  10: 1.0, // social setting
  11: 1.0, // problem approach
  12: 1.0, // pets
  13: 1.0, // learning
  14: 1.0, // cuisine
  16: 1.0, // career
  18: 1.0, // season
  20: 1.0  // vacation
} as const;

export type QuestionId = typeof DATING_QUESTIONS[number]['id'];
export type QuestionOption = typeof DATING_QUESTIONS[number]['options'][number];

// Calculate compatibility score between two users' answers
export function calculateCompatibilityScore(
  userAnswers: Record<QuestionId, QuestionOption>,
  otherAnswers: Record<QuestionId, QuestionOption>
): number {
  let totalWeight = 0;
  let matchedWeight = 0;

  for (const question of DATING_QUESTIONS) {
    const weight = QUESTION_WEIGHTS[question.id] || 1.0;
    totalWeight += weight;

    if (userAnswers[question.id] === otherAnswers[question.id]) {
      matchedWeight += weight;
    }
  }

  return matchedWeight / totalWeight;
} 