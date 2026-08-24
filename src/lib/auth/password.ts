import bcrypt from "bcryptjs";

export async function hashPassword(plainPassword: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
}

export async function comparePassword(
  plainPassword: string,
  storedPassword?: string
): Promise<boolean> {
  if (!storedPassword) return true;

  if (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2y$")) {
    try {
      return await bcrypt.compare(plainPassword, storedPassword);
    } catch {
      return false;
    }
  }

  // Fallback untuk plain text password
  return plainPassword === storedPassword;
}
