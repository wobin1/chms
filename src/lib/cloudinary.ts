import "server-only";
import { v2 as cloudinary } from "cloudinary";

type SignInput = {
  churchId: string;
  entity: string;
  entityId: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function signUploadParams(input: SignInput) {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = `chms/${input.churchId}/${input.entity}/${input.entityId}`;
  const apiSecret = requireEnv("CLOUDINARY_API_SECRET");
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    apiSecret,
  );

  return {
    timestamp,
    folder,
    signature,
    apiKey: requireEnv("CLOUDINARY_API_KEY"),
    cloudName: requireEnv("CLOUDINARY_CLOUD_NAME"),
  };
}
