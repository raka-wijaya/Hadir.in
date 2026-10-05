import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";

// ============================================================
// AUTO-MIGRATION: buat tabel magang_footer jika belum ada
// ============================================================
let isFooterTableChecked = false;
async function ensureFooterTable() {
  if (isFooterTableChecked) return;
  try {
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS magang_footer (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        alamat TEXT DEFAULT NULL,
        email VARCHAR(150) DEFAULT NULL,
        telepon VARCHAR(50) DEFAULT NULL,
        copyright VARCHAR(255) DEFAULT NULL,
        deskripsi TEXT DEFAULT NULL,
        instagram VARCHAR(255) DEFAULT NULL,
        linkedin VARCHAR(255) DEFAULT NULL,
        facebook VARCHAR(255) DEFAULT NULL,
        twitter_x VARCHAR(255) DEFAULT NULL,
        jam_operasional VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    isFooterTableChecked = true;
  } catch (err) {
    console.warn("ensureFooterTable:", err);
  }
}

// GET — ambil footer (singleton row id=1)
export async function GET() {
  await ensureFooterTable();
  try {
    const [rows]: any = await mysqlPool.query(
      "SELECT * FROM magang_footer WHERE id = 1 LIMIT 1"
    );
    const data = rows && rows.length > 0 ? rows[0] : {};
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal mengambil data footer." },
      { status: 500 }
    );
  }
}

// POST — upsert footer (id=1 singleton)
export async function POST(req: Request) {
  await ensureFooterTable();
  try {
    const body = await req.json();
    const {
      alamat, email, telepon, copyright, deskripsi,
      instagram, linkedin, facebook, twitter_x, jam_operasional,
    } = body;

    await mysqlPool.query(`
      INSERT INTO magang_footer
        (id, alamat, email, telepon, copyright, deskripsi, instagram, linkedin, facebook, twitter_x, jam_operasional)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        alamat = VALUES(alamat),
        email = VALUES(email),
        telepon = VALUES(telepon),
        copyright = VALUES(copyright),
        deskripsi = VALUES(deskripsi),
        instagram = VALUES(instagram),
        linkedin = VALUES(linkedin),
        facebook = VALUES(facebook),
        twitter_x = VALUES(twitter_x),
        jam_operasional = VALUES(jam_operasional),
        updated_at = CURRENT_TIMESTAMP
    `, [
      alamat || null, email || null, telepon || null, copyright || null,
      deskripsi || null, instagram || null, linkedin || null,
      facebook || null, twitter_x || null, jam_operasional || null,
    ]);

    return NextResponse.json({
      success: true,
      message: "Data footer berhasil diperbarui.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal menyimpan data footer." },
      { status: 500 }
    );
  }
}
