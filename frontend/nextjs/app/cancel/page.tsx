'use client';

// Import necessary hooks from React and Next.js
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Define the CancelPage component
export default function CancelPage() {
  // Initialize the router object for navigation
  const router = useRouter();

  // useEffect hook to perform side effects after component mount
  useEffect(() => {
    // This effect runs once when the component mounts
    // It's a good place to add analytics for tracking cancelled checkouts
    // For example: trackCancelledCheckout();
    // Currently, this is left as a comment for future implementation
  }, []); // Empty dependency array means this effect runs only once

  // Function to handle navigation back to the plans page
  const handleReturnToPlans = () => {
    // Use the router to programmatically navigate to the '/plans' page
    router.push('/plans');
  };

  // Render the component's UI
  return (
    // Main container with center alignment and padding
    <div className="text-center py-10">
      {/* Page title */}
      <h1 className="text-3xl font-bold mb-4">Payment Cancelled</h1>
      {/* Informational messages */}
      <p className="mb-4">Your payment was cancelled and you have not been charged.</p>
      <p className="mb-6">If you have any questions, please contact our support team.</p>
      {/* Button to return to plans page */}
      <button
        onClick={handleReturnToPlans}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Return to Plans
      </button>
    </div>
  );
}
