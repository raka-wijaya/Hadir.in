/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "10.49.30.240",
    "10.49.30.240:3000",
    "192.168.56.1",
    "192.168.1.115",
    "192.168.1.115:3000",
    "192.168.56.1:3000",
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
  ],
  async redirects() {
    return [
      {
        source: "/magang/absensi",
        destination: "/magang/kehadiran",
        permanent: true,
      },
      {
        source: "/pegawai-os/absensi",
        destination: "/pegawai-os/kehadiran",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
