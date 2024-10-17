// This comment indicates that the following configuration object is of type NextConfig
/** @type {import('next').NextConfig} */

// Define the Next.js configuration object
const nextConfig = {
  // Configure the images optimization feature
  images: {
    // Set up remote patterns for allowed image sources
    remotePatterns: [
      {
        // Allow images from www.google.com
        hostname: 'www.google.com',
      },
      {
        // Allow images from lh3.googleusercontent.com (Google user profile pictures)
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

// Export the configuration object to be used by Next.js
export default nextConfig;