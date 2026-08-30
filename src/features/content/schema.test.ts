import { describe, expect, it } from "vitest";
import { announcementWriteSchema, sermonWriteSchema } from "./schema";

const serviceId = "11111111-1111-4111-8111-111111111111";

describe("content schemas", () => {
  it("requires a service, title, and preacher on a sermon", () => {
    const parsed = sermonWriteSchema.parse({
      serviceId,
      title: "The Good Shepherd",
      preacher: "Rev. Musa",
    });
    expect(parsed.title).toBe("The Good Shepherd");
    expect(parsed.audioUrl).toBeUndefined();
  });

  it("accepts optional sermon media URLs", () => {
    const parsed = sermonWriteSchema.parse({
      serviceId,
      title: "Hope",
      preacher: "Pastor Ada",
      audioUrl: "https://cdn.example.com/hope.mp3",
      videoUrl: "https://cdn.example.com/hope.mp4",
      documentUrl: "https://cdn.example.com/hope.pdf",
    });
    expect(parsed.audioUrl).toBe("https://cdn.example.com/hope.mp3");
  });

  it("rejects a churchId on a sermon payload", () => {
    expect(() =>
      sermonWriteSchema.parse({
        serviceId,
        title: "Hope",
        preacher: "Pastor Ada",
        churchId: "should-not-be-accepted",
      }),
    ).toThrow();
  });

  it("requires announcement title, content, and dates", () => {
    const parsed = announcementWriteSchema.parse({
      title: "Youth Sunday",
      content: "Wear blue.",
      startDate: "2026-09-01",
      endDate: "2026-09-07",
    });
    expect(parsed.title).toBe("Youth Sunday");
  });

  it("rejects a churchId on an announcement payload", () => {
    expect(() =>
      announcementWriteSchema.parse({
        title: "Youth Sunday",
        content: "Wear blue.",
        startDate: "2026-09-01",
        endDate: "2026-09-07",
        churchId: "should-not-be-accepted",
      }),
    ).toThrow();
  });
});
