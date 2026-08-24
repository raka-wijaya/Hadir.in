/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/magang/absensi',
        destination: '/magang/kehadiran',
        permanent: true,
      },
      {
        source: '/pegawai-os/absensi',
        destination: '/pegawai-os/kehadiran',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
