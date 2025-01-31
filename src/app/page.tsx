import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#020817]">
      {/* Purple gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 via-transparent to-transparent" />
      
      <div className="relative mx-auto flex w-full flex-col items-center justify-center space-y-8 px-4 sm:w-[350px]">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tighter text-white font-clash-display sm:text-5xl md:text-6xl">
            SNU Hangout
          </h1>
          <p className="text-lg text-gray-400">
            Your campus, your community, your vibe
          </p>
        </div>
        <div className="w-full">
          <Link href="/auth" className="w-full">
            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 text-lg font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-purple-500/25">
              Sign In with SNU Email
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
