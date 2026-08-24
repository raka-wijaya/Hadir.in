-- phpMyAdmin SQL Dump
-- Database: `hadir_in`

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------
-- Table structure for table `users`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('SUPERADMIN','ADMIN_MAGANG','ADMIN_OS','KARYAWAN_OS','ANAK_MAGANG') NOT NULL,
  `name` varchar(150) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `identity_number` varchar(50) DEFAULT NULL,
  `institution` varchar(200) DEFAULT NULL,
  `study_program` varchar(150) DEFAULT NULL,
  `avatar` varchar(500) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_username` (`username`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `pendaftaran`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `pendaftaran` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `kode_pendaftaran` varchar(30) NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `nama` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `no_hp` varchar(20) NOT NULL,
  `sekolah_kampus` varchar(200) NOT NULL,
  `jurusan` varchar(150) NOT NULL,
  `bagian` varchar(100) NOT NULL,
  `alamat` text NOT NULL,
  `periode_mulai` date DEFAULT NULL,
  `periode_selesai` date DEFAULT NULL,
  `file_cv` varchar(500) DEFAULT NULL,
  `status` enum('PENDING','DITERIMA','DITOLAK','DIBATALKAN') NOT NULL DEFAULT 'PENDING',
  `catatan_admin` text DEFAULT NULL,
  `tanggal_daftar` datetime NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `kode_pendaftaran` (`kode_pendaftaran`),
  KEY `idx_pendaftaran_kode` (`kode_pendaftaran`),
  KEY `idx_pendaftaran_user` (`user_id`),
  KEY `idx_pendaftaran_email` (`email`),
  KEY `idx_pendaftaran_status` (`status`),
  CONSTRAINT `fk_pendaftaran_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `pengaturan_sistem`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `pengaturan_sistem` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `jam_masuk_standar` TIME NOT NULL DEFAULT '07:30:00',
  `jam_pulang_standar` TIME NOT NULL DEFAULT '16:00:00',
  `jam_pulang_jumat` TIME NOT NULL DEFAULT '14:00:00',
  `batas_toleransi_menit` INT NOT NULL DEFAULT 15,
  `hari_kerja` JSON NOT NULL,
  `no_wa_admin_magang` VARCHAR(20) DEFAULT NULL,
  `no_wa_admin_os` VARCHAR(20) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `hari_libur`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `hari_libur` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tanggal` DATE NOT NULL,
  `keterangan` VARCHAR(255) NOT NULL,
  `tipe` ENUM('Nasional', 'Khusus') NOT NULL DEFAULT 'Nasional',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_hari_libur_tanggal` (`tanggal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `periode_pendaftaran`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `periode_pendaftaran` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tanggal_buka` DATE NOT NULL,
  `tanggal_tutup` DATE NOT NULL,
  `aktif_manual` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_periode_tanggal` CHECK (`tanggal_tutup` >= `tanggal_buka`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `log_book`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `log_book` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT(20) UNSIGNED DEFAULT NULL,
  `tanggal` DATE NOT NULL,
  `waktu_mulai` TIME NOT NULL,
  `waktu_selesai` TIME NOT NULL,
  `kategori` ENUM('akta kelahiran','akta kematian','tambah bio data','pindah keluar','pindah datang','media','programmer') NOT NULL,
  `aktivitas` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_log_book_user_id` (`user_id`),
  KEY `idx_log_book_tanggal` (`tanggal`),
  KEY `idx_log_book_kategori` (`kategori`),
  CONSTRAINT `fk_log_book_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Default Seeds
-- --------------------------------------------------------

INSERT INTO `pengaturan_sistem` (
  `id`,
  `jam_masuk_standar`,
  `jam_pulang_standar`,
  `jam_pulang_jumat`,
  `batas_toleransi_menit`,
  `hari_kerja`,
  `no_wa_admin_magang`,
  `no_wa_admin_os`
) VALUES (
  1,
  '07:30:00',
  '16:00:00',
  '14:00:00',
  15,
  '["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]',
  NULL,
  NULL
) ON DUPLICATE KEY UPDATE `id` = `id`;

INSERT INTO `periode_pendaftaran` (
  `id`,
  `tanggal_buka`,
  `tanggal_tutup`,
  `aktif_manual`
) VALUES (
  1,
  '2026-08-01',
  '2026-08-31',
  TRUE
) ON DUPLICATE KEY UPDATE `id` = `id`;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
