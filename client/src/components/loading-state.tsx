import { Card, CardContent } from "@/components/ui/card";

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'card' | 'inline' | 'fullscreen';
}

export function LoadingState({ 
  message = "加载中...", 
  size = 'md', 
  variant = 'card' 
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  };

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center space-x-3">
      <div 
        className={`${sizeClasses[size]} border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin`}
      />
      <span className="text-gray-300">{message}</span>
    </div>
  );

  if (variant === 'fullscreen') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <LoadingSpinner />
      </div>
    );
  }

  if (variant === 'inline') {
    return <LoadingSpinner />;
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-8">
        <LoadingSpinner />
      </CardContent>
    </Card>
  );
}

export function SkeletonCard() {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-600 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-slate-600 rounded"></div>
            <div className="h-3 bg-slate-600 rounded w-5/6"></div>
          </div>
          <div className="flex space-x-2">
            <div className="h-6 bg-slate-600 rounded w-16"></div>
            <div className="h-6 bg-slate-600 rounded w-20"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}