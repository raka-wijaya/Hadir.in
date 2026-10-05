-- ============================================================
-- Hadir.in — Database Schema
-- Database : hadir_in
-- Engine   : MySQL 8.x / MariaDB 10.5+
-- Charset  : utf8mb4 / utf8mb4_unicode_ci
-- Generated: 2026-09-23
--
-- Semua tabel dicocokkan dengan seluruh API route yang aktif.
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------
-- Buat dan pilih database
-- --------------------------------------------------------

CREATE DATABASE IF NOT EXISTS `hadir_in`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `hadir_in`;

-- --------------------------------------------------------
-- DROP TABLE (reverse FK order — aman untuk re-import)
-- --------------------------------------------------------

DROP TABLE IF EXISTS `tugas`;
DROP TABLE IF EXISTS `log_book`;
DROP TABLE IF EXISTS `izin`;
DROP TABLE IF EXISTS `absensi`;
DROP TABLE IF EXISTS `pendaftaran`;
DROP TABLE IF EXISTS `peserta_magang`;
DROP TABLE IF EXISTS `karyawan_os`;
DROP TABLE IF EXISTS `admin`;
DROP TABLE IF EXISTS `pengaturan_sistem`;
DROP TABLE IF EXISTS `magang_timeline`;
DROP TABLE IF EXISTS `magang_benefit`;
DROP TABLE IF EXISTS `magang_proses`;
DROP TABLE IF EXISTS `magang_program`;
DROP TABLE IF EXISTS `magang_footer`;

-- --------------------------------------------------------
-- Table: `admin`
-- Menyimpan akun SUPERADMIN, ADMIN_MAGANG, dan ADMIN_OS
-- API: /api/users/admin, /api/auth/login, /api/auth/register,
--      /api/auth/reset-password, /api/db-status
-- --------------------------------------------------------

CREATE TABLE `admin` (
  `id`                  BIGINT(20) UNSIGNED  NOT NULL AUTO_INCREMENT,
  `name`                VARCHAR(150)         NOT NULL,
  `email`               VARCHAR(150)         NOT NULL,
  `password`            VARCHAR(255)         NOT NULL,
  `role`                ENUM('SUPERADMIN','ADMIN_MAGANG','ADMIN_OS') NOT NULL DEFAULT 'ADMIN_MAGANG',
  `phone`               VARCHAR(20)          DEFAULT NULL,
  `identity_number`     VARCHAR(50)          DEFAULT NULL,
  `avatar`              VARCHAR(500)         DEFAULT NULL,
  `status`              ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `verification_status` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'APPROVED',
  `verified_at`         DATETIME             DEFAULT NULL,
  `verified_by`         BIGINT(20) UNSIGNED  DEFAULT NULL,
  `rejection_reason`    TEXT                 DEFAULT NULL,
  `last_login_at`       DATETIME             DEFAULT NULL,
  `created_at`          TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admin_email` (`email`),
  KEY `idx_admin_email`           (`email`),
  KEY `idx_admin_role`            (`role`),
  KEY `idx_admin_status`          (`status`),
  KEY `idx_admin_identity_number` (`identity_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: `karyawan_os`
-- Menyimpan data Pegawai / Tenaga Outsourcing
-- API: /api/users/karyawan_os, /api/karyawan_os,
--      /api/auth/login, /api/auth/register,
--      /api/auth/reset-password, /api/db-status
-- --------------------------------------------------------

CREATE TABLE `karyawan_os` (
  `id`                  BIGINT(20) UNSIGNED  NOT NULL AUTO_INCREMENT,
  `name`                VARCHAR(150)         NOT NULL,
  `email`               VARCHAR(150)         NOT NULL,
  `password`            VARCHAR(255)         NOT NULL,
  `phone`               VARCHAR(20)          DEFAULT NULL,
  `identity_number`     VARCHAR(50)          DEFAULT NULL,
  `avatar`              VARCHAR(500)         DEFAULT NULL,
  `status`              ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `verification_status` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'APPROVED',
  `verified_at`         DATETIME             DEFAULT NULL,
  `verified_by`         BIGINT(20) UNSIGNED  DEFAULT NULL,
  `rejection_reason`    TEXT                 DEFAULT NULL,
  `last_login_at`       DATETIME             DEFAULT NULL,
  `created_at`          TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_karyawan_os_email` (`email`),
  KEY `idx_karyawan_os_email`           (`email`),
  KEY `idx_karyawan_os_status`          (`status`),
  KEY `idx_karyawan_os_identity_number` (`identity_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: `peserta_magang`
-- Menyimpan data Anak Magang
-- API: /api/users/peserta_magang, /api/peserta_magang,
--      /api/auth/login, /api/auth/register,
--      /api/auth/reset-password, /api/db-status,
--      /api/absensi, /api/izin, /api/log-book, /api/tugas,
--      /api/statistics, /api/statistics/kedisiplinan
--
-- Catatan: cross-table email uniqueness dikenforce di level
-- aplikasi (UNION ALL SELECT admin + karyawan_os + peserta_magang).
-- --------------------------------------------------------

CREATE TABLE `peserta_magang` (
  `id`                  BIGINT(20) UNSIGNED  NOT NULL AUTO_INCREMENT,
  `name`                VARCHAR(150)         NOT NULL,
  `email`               VARCHAR(150)         NOT NULL,
  `password`            VARCHAR(255)         NOT NULL,
  `phone`               VARCHAR(20)          DEFAULT NULL,
  `identity_number`     VARCHAR(50)          DEFAULT NULL,
  `institution`         VARCHAR(200)         DEFAULT NULL,
  `study_program`       VARCHAR(150)         DEFAULT NULL,
  `semester`            TINYINT(3) UNSIGNED  DEFAULT NULL,
  `divisi`              VARCHAR(150)         DEFAULT NULL,
  `batch`               INT(11)              DEFAULT NULL,
  `avatar`              VARCHAR(500)         DEFAULT NULL,
  `start_date`          DATE                 DEFAULT NULL,
  `end_date`            DATE                 DEFAULT NULL,
  `status`              ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `verification_status` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `rejection_reason`    TEXT                 DEFAULT NULL,
  `last_login_at`       DATETIME             DEFAULT NULL,
  `created_at`          TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_peserta_magang_email` (`email`),
  KEY `idx_peserta_magang_email`           (`email`),
  KEY `idx_peserta_magang_status`          (`status`),
  KEY `idx_peserta_magang_verification`    (`verification_status`),
  KEY `idx_peserta_magang_identity_number` (`identity_number`),
  KEY `idx_peserta_magang_institution`     (`institution`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: `pendaftaran`
-- API: /api/pendaftaran
-- --------------------------------------------------------

CREATE TABLE `pendaftaran` (
  `id`                BIGINT(20) UNSIGNED  NOT NULL AUTO_INCREMENT,
  `kode_pendaftaran`  VARCHAR(30)          NOT NULL,
  `peserta_magang_id` BIGINT(20) UNSIGNED  DEFAULT NULL,
  `nama`              VARCHAR(150)         NOT NULL,
  `email`             VARCHAR(150)         NOT NULL,
  `no_hp`             VARCHAR(20)          NOT NULL,
  `sekolah_kampus`    VARCHAR(200)         NOT NULL,
  `study_program`     VARCHAR(150)         DEFAULT NULL,
  `jurusan`           VARCHAR(150)         DEFAULT NULL,
  `semester`          TINYINT(3) UNSIGNED  DEFAULT NULL,
  `bagian`            VARCHAR(100)         NOT NULL,
  `alamat`            TEXT                 NOT NULL,
  `periode_mulai`     DATE                 DEFAULT NULL,
  `periode_selesai`   DATE                 DEFAULT NULL,
  `file_cv`           VARCHAR(500)         DEFAULT NULL,
  `portfolio_file`    VARCHAR(500)         DEFAULT NULL,
  `status`            ENUM('PENDING','DITERIMA','DITOLAK','DIBATALKAN') NOT NULL DEFAULT 'PENDING',
  `catatan_admin`     TEXT                 DEFAULT NULL,
  `tanggal_daftar`    DATETIME             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at`        TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pendaftaran_kode` (`kode_pendaftaran`),
  KEY `idx_pendaftaran_kode`    (`kode_pendaftaran`),
  KEY `idx_pendaftaran_peserta` (`peserta_magang_id`),
  KEY `idx_pendaftaran_email`   (`email`),
  KEY `idx_pendaftaran_status`  (`status`),
  CONSTRAINT `fk_pendaftaran_peserta`
    FOREIGN KEY (`peserta_magang_id`) REFERENCES `peserta_magang` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: `pengaturan_sistem`
-- Singleton row (id=1). Berisi jam kerja, toleransi,
-- periode pendaftaran, hari libur (JSON), dan kontak WA.
-- API: /api/settings, /api/absensi
-- --------------------------------------------------------

CREATE TABLE `pengaturan_sistem` (
  `id`                    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `jam_masuk_standar`     TIME          NOT NULL DEFAULT '07:30:00',
  `jam_pulang_standar`    TIME          NOT NULL DEFAULT '16:00:00',
  `jam_pulang_jumat`      TIME          NOT NULL DEFAULT '14:00:00',
  `batas_toleransi_menit` INT           NOT NULL DEFAULT 15,
  `hari_kerja`            JSON          NOT NULL,
  `no_wa_admin_magang`    VARCHAR(20)   DEFAULT NULL,
  `no_wa_admin_os`        VARCHAR(20)   DEFAULT NULL,
  -- Periode pendaftaran (digunakan oleh /api/settings GET & PUT)
  `tanggal_buka`          DATE          DEFAULT NULL,
  `tanggal_tutup`         DATE          DEFAULT NULL,
  `aktif_manual`          TINYINT(1)    NOT NULL DEFAULT 1,
  -- Hari libur: JSON array [{tanggal, keterangan, tipe}, ...]
  `hari_libur`            JSON          DEFAULT NULL,
  `created_at`            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: `absensi`
-- API: /api/absensi, /api/attendance/check-in,
--      /api/attendance/check-out, /api/statistics,
--      /api/statistics/kedisiplinan
-- --------------------------------------------------------

CREATE TABLE `absensi` (
  `id`                   BIGINT(20) UNSIGNED  NOT NULL AUTO_INCREMENT,
  `karyawan_os_id`       BIGINT(20) UNSIGNED  DEFAULT NULL,
  `peserta_magang_id`    BIGINT(20) UNSIGNED  DEFAULT NULL,
  `pengaturan_sistem_id` INT(11)              DEFAULT NULL,
  `tanggal`              DATE                 NOT NULL,
  `jam_masuk`            TIME                 DEFAULT NULL,
  `jam_keluar`           TIME                 DEFAULT NULL,
  `status`               ENUM('HADIR','IZIN','SAKIT','ALPA') NOT NULL DEFAULT 'HADIR',
  `status_masuk`         ENUM('TEPAT_WAKTU','TERLAMBAT')     DEFAULT NULL,
  `status_pulang`        ENUM('TEPAT_WAKTU','PULANG_CEPAT')  DEFAULT NULL,
  `foto_masuk`           VARCHAR(500)         DEFAULT NULL,
  `foto_keluar`          VARCHAR(500)         DEFAULT NULL,
  `foto_pulang_cepat`    VARCHAR(500)         DEFAULT NULL,
  `keterangan`           TEXT                 DEFAULT NULL,
  `created_at`           TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_absensi_karyawan_os`    (`karyawan_os_id`),
  KEY `idx_absensi_peserta_magang` (`peserta_magang_id`),
  KEY `idx_absensi_tanggal`        (`tanggal`),
  KEY `idx_absensi_status`         (`status`),
  CONSTRAINT `fk_absensi_karyawan_os`
    FOREIGN KEY (`karyawan_os_id`) REFERENCES `karyawan_os` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_absensi_peserta_magang`
    FOREIGN KEY (`peserta_magang_id`) REFERENCES `peserta_magang` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: `izin`
-- API: /api/izin
-- --------------------------------------------------------

CREATE TABLE `izin` (
  `id`                BIGINT(20) UNSIGNED  NOT NULL AUTO_INCREMENT,
  `absensi_id`        BIGINT(20) UNSIGNED  DEFAULT NULL,
  `peserta_magang_id` BIGINT(20) UNSIGNED  DEFAULT NULL,
  `karyawan_os_id`    BIGINT(20) UNSIGNED  DEFAULT NULL,
  `jenis`             VARCHAR(100)         NOT NULL,
  `tanggal_mulai`     DATE                 NOT NULL,
  `tanggal_selesai`   DATE                 NOT NULL,
  `alasan`            TEXT                 NOT NULL,
  `attachment`        VARCHAR(500)         DEFAULT NULL,
  `created_at`        TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_izin_peserta_magang` (`peserta_magang_id`),
  KEY `idx_izin_karyawan_os`    (`karyawan_os_id`),
  KEY `idx_izin_absensi`        (`absensi_id`),
  KEY `idx_izin_tanggal`        (`tanggal_mulai`, `tanggal_selesai`),
  CONSTRAINT `fk_izin_peserta_magang`
    FOREIGN KEY (`peserta_magang_id`) REFERENCES `peserta_magang` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_izin_karyawan_os`
    FOREIGN KEY (`karyawan_os_id`) REFERENCES `karyawan_os` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: `log_book`
-- API: /api/log-book, /api/log-book/[id]
-- --------------------------------------------------------

CREATE TABLE `log_book` (
  `id`                INT(11)             NOT NULL AUTO_INCREMENT,
  `peserta_magang_id` BIGINT(20) UNSIGNED DEFAULT NULL,
  `tanggal`           DATE                NOT NULL,
  `waktu_mulai`       TIME                NOT NULL,
  `waktu_selesai`     TIME                NOT NULL,
  `kategori`          ENUM(
                        'akta kelahiran',
                        'akta kematian',
                        'tambah bio data',
                        'pindah keluar',
                        'pindah datang',
                        'media',
                        'programmer'
                      )                   NOT NULL,
  `aktivitas`         TEXT                NOT NULL,
  `created_at`        TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_log_book_peserta_magang_id` (`peserta_magang_id`),
  KEY `idx_log_book_tanggal`           (`tanggal`),
  KEY `idx_log_book_kategori`          (`kategori`),
  CONSTRAINT `fk_log_book_peserta_magang`
    FOREIGN KEY (`peserta_magang_id`) REFERENCES `peserta_magang` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: `tugas`
-- API: /api/tugas, /api/jobdesk (re-export dari /api/tugas)
-- log_book_id di-SET NULL saat log_book dihapus (lihat DELETE handler)
-- --------------------------------------------------------

CREATE TABLE `tugas` (
  `id`                INT(11)             NOT NULL AUTO_INCREMENT,
  `peserta_magang_id` BIGINT(20) UNSIGNED DEFAULT NULL,
  `log_book_id`       INT(11)             DEFAULT NULL,
  `judul_tugas`       VARCHAR(255)        NOT NULL,
  `status_pengerjaan` ENUM('BELUM_DIKERJAKAN','SELESAI') NOT NULL DEFAULT 'BELUM_DIKERJAKAN',
  `created_at`        TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tugas_peserta_magang_id` (`peserta_magang_id`),
  KEY `idx_tugas_log_book_id`       (`log_book_id`),
  KEY `idx_tugas_status_pengerjaan` (`status_pengerjaan`),
  CONSTRAINT `fk_tugas_peserta_magang`
    FOREIGN KEY (`peserta_magang_id`) REFERENCES `peserta_magang` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_tugas_log_book`
    FOREIGN KEY (`log_book_id`) REFERENCES `log_book` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: `magang_footer`
-- Konten footer landing page magang — singleton row id=1
-- API: /api/magang/footer
-- --------------------------------------------------------

CREATE TABLE `magang_footer` (
  `id`              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `alamat`          TEXT          DEFAULT NULL,
  `email`           VARCHAR(150)  DEFAULT NULL,
  `telepon`         VARCHAR(50)   DEFAULT NULL,
  `copyright`       VARCHAR(255)  DEFAULT NULL,
  `deskripsi`       TEXT          DEFAULT NULL,
  `instagram`       VARCHAR(255)  DEFAULT NULL,
  `linkedin`        VARCHAR(255)  DEFAULT NULL,
  `facebook`        VARCHAR(255)  DEFAULT NULL,
  `twitter_x`       VARCHAR(255)  DEFAULT NULL,
  `jam_operasional` VARCHAR(255)  DEFAULT NULL,
  `created_at`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: `magang_program`
-- Daftar program magang yang tersedia
-- API: /api/magang/program
-- --------------------------------------------------------

CREATE TABLE `magang_program` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `judul`      VARCHAR(255)  NOT NULL,
  `deskripsi`  TEXT          DEFAULT NULL,
  `durasi`     VARCHAR(100)  DEFAULT NULL,
  `kategori`   VARCHAR(100)  DEFAULT NULL,
  `kuota`      INT UNSIGNED  DEFAULT NULL,
  `status`     VARCHAR(50)   NOT NULL DEFAULT 'aktif',
  `gambar`     VARCHAR(500)  DEFAULT NULL,
  `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: `magang_proses`
-- Alur / langkah proses program magang
-- API: /api/magang/proses
-- --------------------------------------------------------

CREATE TABLE `magang_proses` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `step`       INT UNSIGNED  NOT NULL DEFAULT 1,
  `judul`      VARCHAR(255)  NOT NULL,
  `deskripsi`  TEXT          DEFAULT NULL,
  `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: `magang_benefit`
-- Keuntungan / benefit mengikuti program magang
-- API: /api/magang/benefit
-- --------------------------------------------------------

CREATE TABLE `magang_benefit` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `judul`      VARCHAR(255)  NOT NULL,
  `deskripsi`  TEXT          DEFAULT NULL,
  `icon`       VARCHAR(100)  DEFAULT NULL,
  `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: `magang_timeline`
-- Timeline / jadwal kegiatan program magang
-- API: /api/magang/timeline
-- --------------------------------------------------------

CREATE TABLE `magang_timeline` (
  `id`              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `kegiatan`        VARCHAR(255)  NOT NULL,
  `tanggal_mulai`   DATE          DEFAULT NULL,
  `tanggal_selesai` DATE          DEFAULT NULL,
  `deskripsi`       TEXT          DEFAULT NULL,
  `status`          VARCHAR(50)   NOT NULL DEFAULT 'upcoming',
  `urutan`          INT UNSIGNED  NOT NULL DEFAULT 1,
  `created_at`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DEFAULT SEEDS
-- ============================================================

-- Default Admin: SUPERADMIN, ADMIN_MAGANG, ADMIN_OS
-- Password default: "password" (bcrypt) — ganti sebelum production!
INSERT INTO `admin` (`id`, `name`, `email`, `password`, `role`, `phone`, `status`, `verification_status`) VALUES
  (1, 'Super Admin Hadir.in', 'superadmin@hadir-in.com',   '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'SUPERADMIN',   '081234567890', 'ACTIVE', 'APPROVED'),
  (2, 'Admin Magang',         'admin.magang@hadir-in.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMIN_MAGANG', '081234567891', 'ACTIVE', 'APPROVED'),
  (3, 'Admin Pegawai OS',     'admin.os@hadir-in.com',     '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMIN_OS',     '081234567892', 'ACTIVE', 'APPROVED')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- Default pengaturan sistem (singleton row id=1)
INSERT INTO `pengaturan_sistem` (
  `id`, `jam_masuk_standar`, `jam_pulang_standar`, `jam_pulang_jumat`,
  `batas_toleransi_menit`, `hari_kerja`,
  `no_wa_admin_magang`, `no_wa_admin_os`,
  `tanggal_buka`, `tanggal_tutup`, `aktif_manual`, `hari_libur`
) VALUES (
  1,
  '07:30:00',
  '16:00:00',
  '14:00:00',
  15,
  '["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]',
  NULL,
  NULL,
  NULL,
  NULL,
  1,
  '[]'
) ON DUPLICATE KEY UPDATE `id` = `id`;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
