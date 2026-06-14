/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_CONTRACT_ADDRESS: "0xEf2647EeA410292d37AB82C3F39472D9cE0Dc357" },
};
module.exports = nextConfig;
