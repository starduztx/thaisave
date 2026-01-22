/** @type {import('next').NextConfig} */
const nextConfig = {
  // สั่งให้ Next.js แปลงโค้ดของ Library เหล่านี้ด้วย (แก้ Error #target)
  transpilePackages: ['undici', 'firebase', '@firebase/auth', '@firebase/firestore', '@firebase/storage'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '', // ✅ ใช้ Base Path จาก ENV
};

module.exports = nextConfig;