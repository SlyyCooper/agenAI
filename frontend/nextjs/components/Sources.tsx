import { Link } from 'lucide-react';
import SourceCard from "./SourceCard";

export default function Sources({
  sources,
}: {
  sources: { name: string; url: string }[];
}) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Link className="w-5 h-5 text-blue-500" />
        <h3 className="text-xl font-bold text-gray-800">Sources</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.length > 0 ? (
          sources.map((source) => (
            <div key={source.url} className="overflow-hidden">
              <SourceCard source={source} />
            </div>
          ))
        ) : (
          Array(6).fill(0).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-md bg-gray-200" />
          ))
        )}
      </div>
    </div>
  );
}
