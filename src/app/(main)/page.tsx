import { Search } from "lucide-react";

const popularGroups = [
  {
    id: 1,
    name: "Computer Science Club",
    description: "Discuss programming, algorithms, and tech trends",
    members: 156,
    category: "Tech",
  },
  {
    id: 2,
    name: "Basketball Team",
    description: "University basketball team and enthusiasts",
    members: 89,
    category: "Sports",
  },
  {
    id: 3,
    name: "Music Society",
    description: "For music lovers and performers",
    members: 234,
    category: "Music",
  },
  {
    id: 4,
    name: "Study Group",
    description: "Join study sessions and share resources",
    members: 167,
    category: "Academic",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search groups..."
          className="mobile-input pl-9"
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Popular Groups</h2>
        <div className="space-y-4">
          {popularGroups.map((group) => (
            <div key={group.id} className="group-card">
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{group.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    {group.members} members
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {group.description}
                </p>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {group.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 