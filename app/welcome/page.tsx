'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function WelcomePage() {
  const router = useRouter();

  const handleCheckIn = () => {
    router.push('/checkin');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      {/* Logo - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <Image
          src="/frontier-tower-wordmark.svg"
          alt="Frontier Tower"
          width={320}
          height={80}
          priority
          className="h-20 sm:h-24 md:h-28 lg:h-32 w-auto mb-6"
        />
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-800">
          Frontier Tower Guest Check-in
        </h1>
      </div>

      {/* Button - Bottom section with proper spacing */}
      <div className="pb-32 md:pb-40">
        <button
          onClick={handleCheckIn}
          className="bg-[#7C43E7] hover:bg-[#6B3AC7] text-white px-12 py-4 rounded-xl text-lg md:text-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
        >
          Tap to check in
        </button>
      </div>
    </div>
  );
}