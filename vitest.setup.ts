import { vi } from "vitest";

vi.mock("server-only", () => ({}));

process.env.SESSION_SECRET ??=
  "test-session-secret-must-be-at-least-32-chars";
process.env.DATABASE_URL ??=
  "postgresql://chms:chms@localhost:5432/chms";
process.env.DIRECT_URL ??= process.env.DATABASE_URL;
process.env.CLOUDINARY_CLOUD_NAME ??= "test-cloud";
process.env.CLOUDINARY_API_KEY ??= "test-key";
process.env.CLOUDINARY_API_SECRET ??= "test-secret";
