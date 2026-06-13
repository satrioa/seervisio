import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;
const PIN_LENGTH = 6;
const PIN_PATTERN = /^\d{6}$/;

export function validatePinFormat(pin: string): string | null {
  if (!pin || pin.length !== PIN_LENGTH) {
    return `PIN harus ${PIN_LENGTH} digit.`;
  }
  if (!PIN_PATTERN.test(pin)) {
    return "PIN hanya boleh berisi angka.";
  }
  return null;
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

export async function verifyPin(
  pin: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}
