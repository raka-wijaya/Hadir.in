import { NextRequest, NextResponse } from "next/server";
import { mysqlPool } from "@/lib/db/prisma";
import { TugasItem } from "@/types";

/**
 * ============================================================
 * API Route: /api/tugas
 *
 * STRUKTUR DATABASE:
 * Tabel `log_book`:
 *  - id                INT(11) PRIMARY KEY AUTO_INCREMENT
 *  - peserta_magang_id BIGINT(20) UNSIGNED
 *  - tanggal           DATE
 *  - waktu_mulai       TIME
 *  - waktu_selesai     TIME
 *  - kategori          ENUM('akta kelahiran','akta kematian','tambah bio data','pindah keluar','pindah datang','media','programmer')
 *  - aktivitas         TEXT
 *  - created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 *
 * Tabel `tugas`:
 *  - id                INT(11) PRIMARY KEY AUTO_INCREMENT
 *  - peserta_magang_id BIGINT(20) UNSIGNED
 *  - log_book_id       INT(11) NULL (FK -> log_book.id)
 *  - judul_tugas       VARCHAR(255)
 *  - status_pengerjaan ENUM('BELUM_DIKERJAKAN', 'SELESAI')
 *  - created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 *
 * (Kolom `deskripsi` dan `kategori` pada tabel `tugas` telah DIHAPUS sesuai ALTER TABLE)
 * ============================================================
 */

function normalizeStatusPengerjaan(
  statusInput?: string | null
): "BELUM_DIKERJAKAN" | "SELESAI" {
  if (!statusInput) return "BELUM_DIKERJAKAN";
  const s = statusInput.toUpperCase().trim();
  if (s === "SELESAI" || s === "COMPLETED" || s === "DONE") return "SELESAI";
  return "BELUM_DIKERJAKAN";
}

async function ensureTugasTableExists() {
  try {
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS \`tugas\` (
        \`id\`                INT(11)        NOT NULL AUTO_INCREMENT,
        \`peserta_magang_id\` BIGINT(20) UNSIGNED DEFAULT NULL,
        \`log_book_id\`       INT(11)        DEFAULT NULL,
        \`judul_tugas\`       VARCHAR(255)   NOT NULL,
        \`status_pengerjaan\` ENUM('BELUM_DIKERJAKAN','SELESAI') NOT NULL DEFAULT 'BELUM_DIKERJAKAN',
        \`created_at\`        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_tugas_peserta_magang_id\`  (\`peserta_magang_id\`),
        KEY \`idx_tugas_log_book_id\`        (\`log_book_id\`),
        KEY \`idx_tugas_status_pengerjaan\`  (\`status_pengerjaan\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Jalankan ALTER TABLE untuk drop kolom deskripsi & kategori jika masih ada
    try {
      const [cols]: any = await mysqlPool.query(`SHOW COLUMNS FROM \`tugas\``);
      const existing = new Set(
        (cols as any[]).map((c: any) => String(c.Field).toLowerCase()),
      );

      if (existing.has("deskripsi")) {
        await mysqlPool.query(
          `ALTER TABLE \`tugas\` DROP COLUMN \`deskripsi\``,
        );
      }
      if (existing.has("kategori")) {
        await mysqlPool.query(`ALTER TABLE \`tugas\` DROP COLUMN \`kategori\``);
      }
    } catch (migErr) {
      console.warn("[ensureTugasTableExists] drop column warning:", migErr);
    }
  } catch (err) {
    console.warn("[ensureTugasTableExists] warning:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tugas
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    await ensureTugasTableExists();

    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");
    const pesertaMagangId =
      searchParams.get("peserta_magang_id") ||
      searchParams.get("pesertaMagangId");
    const logBookId =
      searchParams.get("log_book_id") || searchParams.get("logBookId");
    const statusPengerjaan =
      searchParams.get("status_pengerjaan") ||
      searchParams.get("statusPengerjaan");
    const q = searchParams.get("q") || searchParams.get("search");
    const tanggalParam =
      searchParams.get("tanggal") || searchParams.get("date");
    const startDate =
      searchParams.get("start_date") || searchParams.get("startDate");
    const endDate = searchParams.get("end_date") || searchParams.get("endDate");

    const conditions: string[] = [];
    const params: any[] = [];

    if (idParam) {
      conditions.push("t.id = ?");
      params.push(Number(idParam));
    }
    if (pesertaMagangId) {
      conditions.push("t.peserta_magang_id = ?");
      params.push(pesertaMagangId);
    }
    if (logBookId) {
      conditions.push("t.log_book_id = ?");
      params.push(logBookId);
    }
    if (tanggalParam) {
      conditions.push("DATE(t.created_at) = ?");
      params.push(tanggalParam);
    }
    if (startDate) {
      conditions.push("DATE(t.created_at) >= ?");
      params.push(startDate);
    }
    if (endDate) {
      conditions.push("DATE(t.created_at) <= ?");
      params.push(endDate);
    }
    if (statusPengerjaan && statusPengerjaan !== "ALL") {
      conditions.push("t.status_pengerjaan = ?");
      params.push(normalizeStatusPengerjaan(statusPengerjaan));
    }
    if (q && q.trim()) {
      conditions.push(
        "(t.judul_tugas LIKE ? OR pm.name LIKE ? OR pm.institution LIKE ? OR pm.divisi LIKE ?)",
      );
      const term = `%${q.trim()}%`;
      params.push(term, term, term, term);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows]: any = await mysqlPool.query(
      `
      SELECT
        t.id,
        t.peserta_magang_id,
        t.log_book_id,
        t.judul_tugas,
        t.status_pengerjaan,
        DATE_FORMAT(t.created_at, '%Y-%m-%d %H:%i:%s') AS created_at_formatted,
        t.created_at,
        pm.name          AS pm_name,
        pm.avatar        AS pm_avatar,
        pm.institution   AS pm_institution,
        pm.study_program AS pm_study_program,
        pm.divisi        AS pm_divisi,
        lb.aktivitas     AS log_book_aktivitas,
        lb.tanggal       AS log_book_tanggal
      FROM \`tugas\` t
      LEFT JOIN peserta_magang pm ON pm.id = t.peserta_magang_id
      LEFT JOIN \`log_book\`   lb ON lb.id = t.log_book_id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT 150
      `,
      params,
    );

    const data: TugasItem[] = Array.isArray(rows)
      ? (rows as any[]).map((r) => {
          const createdAtStr =
            r.created_at_formatted ||
            (r.created_at ? new Date(r.created_at).toISOString() : null);

          return {
            id: Number(r.id),
            peserta_magang_id: r.peserta_magang_id
              ? Number(r.peserta_magang_id)
              : null,
            pesertaMagangId: r.peserta_magang_id
              ? Number(r.peserta_magang_id)
              : null,
            log_book_id: r.log_book_id ? Number(r.log_book_id) : null,
            logBookId: r.log_book_id ? Number(r.log_book_id) : null,
            judul_tugas: r.judul_tugas || "",
            judulTugas: r.judul_tugas || "",
            status_pengerjaan: r.status_pengerjaan || "BELUM_DIKERJAKAN",
            statusPengerjaan: r.status_pengerjaan || "BELUM_DIKERJAKAN",
            created_at: createdAtStr,
            createdAt: createdAtStr,
            user_nama: r.pm_name || null,
            userName: r.pm_name || null,
            user_avatar: r.pm_avatar || null,
            userAvatar: r.pm_avatar || null,
            user_institution: r.pm_institution || null,
            user_sekolah: r.pm_institution || null,
            user_study_program: r.pm_study_program || null,
            user_divisi: r.pm_divisi || null,
            userDivisi: r.pm_divisi || null,
            divisi: r.pm_divisi || null,
            user_role: "ANAK_MAGANG",
            userRole: "ANAK_MAGANG",
            log_book_aktivitas: r.log_book_aktivitas || null,
            log_book_tanggal: r.log_book_tanggal
              ? String(r.log_book_tanggal).slice(0, 10)
              : undefined,
          };
        })
      : [];

    if (idParam && data.length > 0) {
      return NextResponse.json({
        success: true,
        data: data[0],
        item: data[0],
        total: 1,
      });
    }

    return NextResponse.json({ success: true, data, total: data.length });
  } catch (err: any) {
    console.error("GET /api/tugas error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Gagal memuat data tugas.",
        data: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tugas
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  await ensureTugasTableExists();

  const body = await req.json().catch(() => ({}));

  const rawIds = body.peserta_magang_ids || body.pesertaMagangIds;
  let targetIds: (number | null)[] = [];

  if (Array.isArray(rawIds) && rawIds.length > 0) {
    targetIds = rawIds
      .map((id: any) => Number(id))
      .filter((id: number) => !isNaN(id) && id > 0);
  } else if (body.peserta_magang_id || body.pesertaMagangId) {
    targetIds = [Number(body.peserta_magang_id || body.pesertaMagangId)];
  } else {
    targetIds = [null];
  }

  const judulTugas = (body.judul_tugas || body.judulTugas || "").trim();

  // Status awal tugas: BELUM_DIKERJAKAN sebelum magang mengisi log-booknya
  const requestedStatus = body.status_pengerjaan || body.statusPengerjaan;
  const statusPengerjaan: "BELUM_DIKERJAKAN" | "SELESAI" =
    requestedStatus && String(requestedStatus).toUpperCase() === "SELESAI"
      ? "SELESAI"
      : "BELUM_DIKERJAKAN";

  if (!judulTugas) {
    return NextResponse.json(
      { success: false, message: "Judul tugas wajib diisi." },
      { status: 400 },
    );
  }

  const insertedRecords: any[] = [];

  for (const pId of targetIds) {
    const conn = await mysqlPool.getConnection();
    let currentStage:
      | "INIT"
      | "INSERT_TUGAS"
      | "CREATE_LOGBOOK"
      | "UPDATE_TUGAS" = "INIT";

    try {
      await conn.beginTransaction();

      let tugasId: number;

      if (body.id) {
        const [existingTaskRows]: any = await conn.query(
          "SELECT id, log_book_id FROM `tugas` WHERE id = ? LIMIT 1",
          [Number(body.id)],
        );
        if (existingTaskRows && existingTaskRows.length > 0) {
          tugasId = Number(existingTaskRows[0].id);
        } else {
          currentStage = "INSERT_TUGAS";
          const [insertResult]: any = await conn.query(
            `INSERT INTO \`tugas\`
               (\`peserta_magang_id\`, \`log_book_id\`, \`judul_tugas\`, \`status_pengerjaan\`)
             VALUES (?, NULL, ?, ?)`,
            [pId ? Number(pId) : null, judulTugas, statusPengerjaan],
          );
          tugasId = Number(insertResult.insertId);
        }
      } else {
        currentStage = "INSERT_TUGAS";
        const [insertResult]: any = await conn.query(
          `INSERT INTO \`tugas\`
             (\`peserta_magang_id\`, \`log_book_id\`, \`judul_tugas\`, \`status_pengerjaan\`)
           VALUES (?, NULL, ?, ?)`,
          [pId ? Number(pId) : null, judulTugas, statusPengerjaan],
        );
        tugasId = Number(insertResult.insertId);
      }

      const [tugasRows]: any = await conn.query(
        `SELECT
           id,
           peserta_magang_id,
           log_book_id,
           created_at,
           DATE_FORMAT(created_at, '%Y-%m-%d') AS tanggal_db,
           DATE_FORMAT(created_at, '%H:%i:%s') AS waktu_db,
           DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at_formatted
         FROM \`tugas\`
         WHERE id = ?
         LIMIT 1`,
        [tugasId],
      );

      if (!tugasRows || tugasRows.length === 0) {
        throw new Error(`Tugas dengan ID ${tugasId} tidak ditemukan.`);
      }

      const tugasRow = tugasRows[0];
      const pesertaIdDb = tugasRow.peserta_magang_id
        ? Number(tugasRow.peserta_magang_id)
        : null;
      const tanggalDb = String(tugasRow.tanggal_db);
      const waktuDb = String(tugasRow.waktu_db);
      const createdAtFormatted = String(tugasRow.created_at_formatted);

      console.log(`[TUGAS] ID: ${tugasId}`);
      console.log(`[TUGAS] created_at: ${createdAtFormatted}`);
      console.log(`[TUGAS] status_pengerjaan: ${statusPengerjaan}`);

      let effectiveLogBookId: number | null = tugasRow.log_book_id
        ? Number(tugasRow.log_book_id)
        : null;

      if (statusPengerjaan === "SELESAI") {
        if (effectiveLogBookId !== null) {
          console.log(`[TUGAS] log_book_id sudah ada: ${effectiveLogBookId}`);
        } else if (pesertaIdDb) {
          currentStage = "CREATE_LOGBOOK";

          console.log(`[LOG_BOOK] peserta_magang_id: ${pesertaIdDb}`);
          console.log(`[LOG_BOOK] tanggal: ${tanggalDb}`);
          console.log(`[LOG_BOOK] waktu_mulai: ${waktuDb}`);
          console.log(`[LOG_BOOK] waktu_selesai: ${waktuDb}`);

          const [lbInsertResult]: any = await conn.query(
            `INSERT INTO \`log_book\`
               (\`peserta_magang_id\`, \`tanggal\`, \`waktu_mulai\`, \`waktu_selesai\`, \`kategori\`, \`aktivitas\`)
             VALUES (?, ?, ?, ?, 'programmer', ?)`,
            [pesertaIdDb, tanggalDb, waktuDb, waktuDb, judulTugas],
          );

          effectiveLogBookId = Number(lbInsertResult.insertId);
          console.log(`[LOG_BOOK] ID: ${effectiveLogBookId}`);

          currentStage = "UPDATE_TUGAS";
          await conn.query(
            "UPDATE `tugas` SET `log_book_id` = ? WHERE `id` = ?",
            [effectiveLogBookId, tugasId],
          );
          console.log(
            `[TUGAS] log_book_id berhasil disimpan: ${effectiveLogBookId}`,
          );
        }
      } else {
        console.log(
          `[TUGAS] Status: BELUM_DIKERJAKAN — menunggu si magang mengisi log-book.`,
        );
      }

      await conn.commit();

      let userInfo: any = {};
      if (pesertaIdDb) {
        try {
          const [pmRows]: any = await mysqlPool.query(
            "SELECT id, name, avatar, institution, study_program, divisi FROM peserta_magang WHERE id = ? LIMIT 1",
            [pesertaIdDb],
          );
          if (Array.isArray(pmRows) && pmRows.length > 0) {
            userInfo = pmRows[0];
          }
        } catch {
          // ignore
        }
      }

      insertedRecords.push({
        id: tugasId,
        peserta_magang_id: pesertaIdDb ? Number(pesertaIdDb) : null,
        log_book_id: effectiveLogBookId,
        judul_tugas: judulTugas,
        status_pengerjaan: statusPengerjaan,
        created_at: createdAtFormatted,
        pesertaMagangId: pesertaIdDb ? Number(pesertaIdDb) : null,
        logBookId: effectiveLogBookId,
        judulTugas: judulTugas,
        statusPengerjaan: statusPengerjaan,
        createdAt: createdAtFormatted,
        user_nama: userInfo.name || null,
        userName: userInfo.name || null,
        user_avatar: userInfo.avatar || null,
        userAvatar: userInfo.avatar || null,
        user_institution: userInfo.institution || null,
        user_divisi: userInfo.divisi || null,
        userDivisi: userInfo.divisi || null,
        divisi: userInfo.divisi || null,
      });
    } catch (err: any) {
      try {
        await conn.rollback();
      } catch (rbErr) {
        console.error("[POST /api/tugas] Rollback error:", rbErr);
      } finally {
        conn.release();
      }

      if (
        currentStage === "CREATE_LOGBOOK" ||
        currentStage === "UPDATE_TUGAS"
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Tugas berhasil dibuat tetapi gagal membuat log-book",
            error: err?.message || String(err),
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: err?.message || "Tugas gagal disimpan.",
          error: err?.message || String(err),
        },
        { status: 500 },
      );
    } finally {
      try {
        conn.release();
      } catch {
        // ignore
      }
    }
  }

  const message =
    statusPengerjaan === "SELESAI"
      ? "Tugas berhasil ditambahkan dan dicatat ke log book."
      : "Tugas berhasil ditambahkan. Menunggu peserta magang mengisi log book.";

  return NextResponse.json(
    {
      success: true,
      message,
      data: insertedRecords[0] || null,
      items: insertedRecords,
      count: insertedRecords.length,
    },
    { status: 201 },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT / PATCH /api/tugas
// ─────────────────────────────────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  return handleUpdate(req);
}

export async function PATCH(req: NextRequest) {
  return handleUpdate(req);
}

async function handleUpdate(req: NextRequest) {
  try {
    await ensureTugasTableExists();
    const body = await req.json();

    const id = body.id;
    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID tugas wajib disertakan." },
        { status: 400 }
      );
    }

    const [existingRows]: any = await mysqlPool.query(
      `SELECT id, peserta_magang_id, log_book_id, judul_tugas, status_pengerjaan,
              created_at,
              DATE_FORMAT(created_at, '%Y-%m-%d') AS tanggal_db,
              DATE_FORMAT(created_at, '%H:%i:%s') AS waktu_db
       FROM \`tugas\` WHERE \`id\` = ? LIMIT 1`,
      [Number(id)],
    );

    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tugas tidak ditemukan." },
        { status: 404 }
      );
    }

    const task = existingRows[0];
    const currentStatus = String(task.status_pengerjaan || "").toUpperCase();
    const statusRequested =
      body.status_pengerjaan !== undefined ||
      body.statusPengerjaan !== undefined;
    const newStatus = statusRequested
      ? normalizeStatusPengerjaan(
          body.status_pengerjaan || body.statusPengerjaan,
        )
      : (currentStatus as "BELUM_DIKERJAKAN" | "SELESAI");

    const pmId =
      body.peserta_magang_id !== undefined || body.pesertaMagangId !== undefined
        ? (body.peserta_magang_id ?? body.pesertaMagangId)
        : task.peserta_magang_id;

    const judulTugas = body.judul_tugas ?? body.judulTugas ?? task.judul_tugas;

    const tanggalDb = String(task.tanggal_db);
    const waktuDb = String(task.waktu_db);

    let targetLogBookId: number | null = task.log_book_id
      ? Number(task.log_book_id)
      : null;

    const conn = await mysqlPool.getConnection();
    try {
      await conn.beginTransaction();

      if (newStatus === "SELESAI") {
        if (targetLogBookId) {
          const [lbCheck]: any = await conn.query(
            "SELECT id FROM `log_book` WHERE `id` = ? LIMIT 1",
            [targetLogBookId],
          );
          if (!lbCheck || lbCheck.length === 0) {
            const [lbInsert]: any = await conn.query(
              `INSERT INTO \`log_book\`
                 (\`peserta_magang_id\`, \`tanggal\`, \`waktu_mulai\`, \`waktu_selesai\`, \`kategori\`, \`aktivitas\`)
               VALUES (?, ?, ?, ?, 'programmer', ?)`,
              [
                pmId ? Number(pmId) : null,
                tanggalDb,
                waktuDb,
                waktuDb,
                judulTugas,
              ],
            );
            targetLogBookId = Number(lbInsert.insertId);
          }
        } else if (pmId) {
          console.log(
            `[LOG_BOOK] Tugas #${id} diselesaikan, membuat log-book baru`,
          );
          const [lbInsert]: any = await conn.query(
            `INSERT INTO \`log_book\`
               (\`peserta_magang_id\`, \`tanggal\`, \`waktu_mulai\`, \`waktu_selesai\`, \`kategori\`, \`aktivitas\`)
             VALUES (?, ?, ?, ?, 'programmer', ?)`,
            [Number(pmId), tanggalDb, waktuDb, waktuDb, judulTugas],
          );
          targetLogBookId = Number(lbInsert.insertId);
          console.log(`[LOG_BOOK] ID: ${targetLogBookId}`);
        }
      } else if (
        newStatus === "BELUM_DIKERJAKAN" &&
        currentStatus === "SELESAI"
      ) {
        if (targetLogBookId) {
          await conn.query("DELETE FROM `log_book` WHERE `id` = ?", [
            targetLogBookId,
          ]);
          targetLogBookId = null;
        }
      }

      const updates: string[] = [];
      const updateParams: any[] = [];

      if (body.judul_tugas !== undefined || body.judulTugas !== undefined) {
        updates.push("`judul_tugas` = ?");
        updateParams.push(body.judul_tugas || body.judulTugas);
      }
      if (statusRequested) {
        updates.push("`status_pengerjaan` = ?");
        updateParams.push(newStatus);
      }
      if (
        body.peserta_magang_id !== undefined ||
        body.pesertaMagangId !== undefined
      ) {
        updates.push("`peserta_magang_id` = ?");
        updateParams.push(pmId ? Number(pmId) : null);
      }
      if (
        targetLogBookId !== (task.log_book_id ? Number(task.log_book_id) : null)
      ) {
        updates.push("`log_book_id` = ?");
        updateParams.push(targetLogBookId);
      }

      if (updates.length > 0) {
        updateParams.push(Number(id));
        await conn.query(
          `UPDATE \`tugas\` SET ${updates.join(", ")} WHERE \`id\` = ?`,
          updateParams,
        );
      }

      await conn.commit();
    } catch (updateErr) {
      await conn.rollback();
      throw updateErr;
    } finally {
      conn.release();
    }

    return NextResponse.json({
      success: true,
      message:
        newStatus === "SELESAI"
          ? "Tugas berhasil diselesaikan dan dicatat ke log book."
          : "Tugas berhasil diperbarui.",
      log_book_id: targetLogBookId,
      status_pengerjaan: newStatus,
    });
  } catch (err: any) {
    console.error("PUT/PATCH /api/tugas error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Gagal memperbarui tugas.",
      },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/tugas
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    await ensureTugasTableExists();
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {
        // ignore
      }
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID tugas wajib disertakan." },
        { status: 400 }
      );
    }

    const conn = await mysqlPool.getConnection();
    try {
      await conn.beginTransaction();

      const [existingRows]: any = await conn.query(
        "SELECT log_book_id FROM `tugas` WHERE `id` = ? LIMIT 1",
        [Number(id)],
      );

      if (
        existingRows &&
        existingRows.length > 0 &&
        existingRows[0].log_book_id
      ) {
        const lbId = Number(existingRows[0].log_book_id);
        await conn.query("DELETE FROM `log_book` WHERE `id` = ?", [lbId]);
      }

      const [result]: any = await conn.query(
        "DELETE FROM `tugas` WHERE `id` = ?",
        [Number(id)],
      );

      if (result.affectedRows === 0) {
        await conn.rollback();
        return NextResponse.json(
          {
            success: false,
            message: "Data tugas tidak ditemukan atau sudah dihapus.",
          },
          { status: 404 },
        );
      }

      await conn.commit();
    } catch (delErr) {
      await conn.rollback();
      throw delErr;
    } finally {
      conn.release();
    }

    return NextResponse.json({
      success: true,
      message: "Tugas beserta catatan log book terkait berhasil dihapus.",
    });
  } catch (err: any) {
    console.error("DELETE /api/tugas error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal menghapus tugas." },
      { status: 500 }
    );
  }
}
