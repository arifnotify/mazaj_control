import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export function isValidEmployeePin(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{3}$/.test(pin);
}

export async function hashEmployeePin(pin: string): Promise<string> {
  if (!isValidEmployeePin(pin)) {
    throw new Error("PIN must contain exactly 3 digits");
  }

  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(pin, salt, KEY_LENGTH)) as Buffer;

  return `${salt}:${key.toString("hex")}`;
}

export async function verifyEmployeePin(
  pin: string,
  storedHash: string
): Promise<boolean> {
  if (!isValidEmployeePin(pin) || !storedHash) return false;

  const [salt, keyHex] = storedHash.split(":");

  if (!salt || !keyHex || !/^[a-f0-9]+$/i.test(keyHex)) {
    return false;
  }

  try {
    const storedKey = Buffer.from(keyHex, "hex");
    const derivedKey = (await scrypt(
      pin,
      salt,
      storedKey.length
    )) as Buffer;

    return (
      storedKey.length === derivedKey.length &&
      timingSafeEqual(storedKey, derivedKey)
    );
  } catch {
    return false;
  }
}