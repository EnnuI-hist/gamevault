import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import GamePageContent from './GamePageContent';

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="animate-spin text-indigo-500" size={36} />
        </div>
      }
    >
      <GamePageContent />
    </Suspense>
  );
}
