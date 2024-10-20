import Link from 'next/link';

export default function CancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold mb-4">Payment Cancelled</h1>
        <p className="mb-6">Your payment was cancelled. If you have any questions, please contact support.</p>
        <Link href="/plans" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
          Try Again
        </Link>
      </div>
    </div>
  );
}
