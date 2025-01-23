const BRANCHES = [
  'CSE',
  'ECE',
  'Mechanical',
  'Civil',
  'Chemical',
  'Physics',
  'Mathematics',
  'Chemistry',
  'BMS',
  'Economics',
  'Ecofin',
  'English',
  'History',
  'Sociology',
  'Design'
];

export default function ProfilePage() {
  // ... rest of the component code ...

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* ... other form fields ... */}
        
        <div>
          <label className="block text-sm font-medium mb-2">Branch</label>
          <select
            value={profile?.branch || ''}
            onChange={(e) => setProfile({ ...profile, branch: e.target.value })}
            className="w-full bg-white/5 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Select your branch</option>
            {BRANCHES.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))}
          </select>
        </div>
        
        {/* ... rest of the form ... */}
      </div>
    </div>
  );
} 