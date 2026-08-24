import mysql from "mysql2/promise";

function getDbConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  let host = process.env.DB_HOST || "localhost";
  let port = Number(process.env.DB_PORT) || 3306;
  let user = process.env.DB_USER || "root";
  let password = process.env.DB_PASSWORD || "";
  let database = process.env.DB_NAME || "hadir_in";

  if (databaseUrl) {
    try {
      const parsed = new URL(databaseUrl);
      host = parsed.hostname || host;
      port = parsed.port ? Number(parsed.port) : port;
      user = parsed.username || user;
      password = parsed.password || password;
      const dbPath = parsed.pathname ? parsed.pathname.replace(/^\//, "") : "";
      if (dbPath) {
        database = dbPath;
      }
    } catch {
      // url parse failed, use defaults
    }
  }

  return {
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4",
  };
}

export const mysqlPool = mysql.createPool(getDbConfig());
