import bcrypt from "bcryptjs";

type generateCodeResponse = {
  code: string,
  codeHash: string,
  expiresAt: Date
} 

async function generateVerificationCode(): Promise<generateCodeResponse> {
  const code = Math.floor(100000 + Math.random() * 90000).toString();
  const codeHash = await bcrypt.hash(code, 10);

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min

  return {
    code,
    codeHash,
    expiresAt
  }
}

export default generateVerificationCode;