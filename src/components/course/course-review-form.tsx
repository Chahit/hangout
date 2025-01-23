import { useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { moderateContent } from "@/lib/moderation";

type CourseReviewFormProps = {
  courseId: string;
  onSuccess: () => void;
};

export function CourseReviewForm({ courseId, onSuccess }: CourseReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [difficulty, setDifficulty] = useState(0);
  const [workload, setWorkload] = useState(0);
  const [content, setContent] = useState("");
  const [semester, setSemester] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Moderate the review content
      const moderation = await moderateContent(content, "course_review", courseId);

      if (!moderation.isAccepted) {
        setError("Your review contains inappropriate content. Please revise and try again.");
        return;
      }

      const { error: submitError } = await supabase.from("course_reviews").insert({
        course_id: courseId,
        rating,
        difficulty,
        workload,
        content,
        semester,
        year,
      });

      if (submitError) throw submitError;

      onSuccess();
      // Reset form
      setRating(0);
      setDifficulty(0);
      setWorkload(0);
      setContent("");
      setSemester("");
      setYear(new Date().getFullYear());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const RatingStars = ({ value, onChange }: { value: number; onChange: (value: number) => void }) => (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`p-1 rounded-full hover:bg-primary/10 transition-colors ${
            star <= value ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Star className="w-5 h-5" fill={star <= value ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Overall Rating</label>
          <RatingStars value={rating} onChange={setRating} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Difficulty</label>
          <RatingStars value={difficulty} onChange={setDifficulty} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Workload</label>
          <RatingStars value={workload} onChange={setWorkload} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Review</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mobile-input min-h-[100px]"
            placeholder="Share your experience with this course..."
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Semester</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="mobile-input"
              required
            >
              <option value="">Select semester</option>
              <option value="Fall">Fall</option>
              <option value="Spring">Spring</option>
              <option value="Summer">Summer</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="mobile-input"
              min={2000}
              max={new Date().getFullYear()}
              required
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mobile-button w-full"
      >
        {isSubmitting ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
} 