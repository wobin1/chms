import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

const requireSession = vi.fn();
const listChurches = vi.fn();
const getMember = vi.fn();
const createChurch = vi.fn();
const getFamily = vi.fn();
const getService = vi.fn();
const saveServiceAttendance = vi.fn();
const getVisitor = vi.fn();
const getChurchUser = vi.fn();
const getChurchRole = vi.fn();
const exportMembersCsv = vi.fn();
const getChild = vi.fn();
const getEvent = vi.fn();
const saveEventAttendance = vi.fn();
const getGiving = vi.fn();
const getExpense = vi.fn();
const getSermon = vi.fn();
const getAnnouncement = vi.fn();
const getMembershipReport = vi.fn();
const getFinanceReport = vi.fn();
const getPastoralCase = vi.fn();
const getPrayerRequest = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireSession: (...args: unknown[]) => requireSession(...args),
}));

vi.mock("@/lib/church-service", () => ({
  listChurches: (...args: unknown[]) => listChurches(...args),
  createChurch: (...args: unknown[]) => createChurch(...args),
  getChurchByIdForSession: vi.fn(),
  updateChurchAsPlatform: vi.fn(),
  getCurrentChurch: vi.fn(),
  updateCurrentChurch: vi.fn(),
}));

vi.mock("@/lib/member-service", () => ({
  getMember: (...args: unknown[]) => getMember(...args),
  listMembers: vi.fn(),
  createMember: vi.fn(),
  updateMember: vi.fn(),
  exportMembersCsv: (...args: unknown[]) => exportMembersCsv(...args),
}));

vi.mock("@/lib/family-service", () => ({
  getFamily: (...args: unknown[]) => getFamily(...args),
  listFamilies: vi.fn(),
  createFamily: vi.fn(),
  updateFamily: vi.fn(),
}));

vi.mock("@/lib/service-service", () => ({
  getService: (...args: unknown[]) => getService(...args),
  listServices: vi.fn(),
  createService: vi.fn(),
  updateService: vi.fn(),
  saveServiceAttendance: (...args: unknown[]) => saveServiceAttendance(...args),
  listServiceTypes: vi.fn(),
  createServiceType: vi.fn(),
  listAttendanceCategories: vi.fn(),
  createAttendanceCategory: vi.fn(),
}));

vi.mock("@/lib/visitor-service", () => ({
  getVisitor: (...args: unknown[]) => getVisitor(...args),
  listVisitors: vi.fn(),
  createVisitor: vi.fn(),
  updateVisitor: vi.fn(),
  addVisitorVisit: vi.fn(),
  convertVisitor: vi.fn(),
}));

vi.mock("@/lib/user-service", () => ({
  getChurchUser: (...args: unknown[]) => getChurchUser(...args),
  getChurchRole: (...args: unknown[]) => getChurchRole(...args),
  listChurchUsers: vi.fn(),
  createChurchUser: vi.fn(),
  updateChurchUser: vi.fn(),
  listChurchRoles: vi.fn(),
  updateChurchRolePermissions: vi.fn(),
  listChurchPermissionCatalog: vi.fn(),
}));

vi.mock("@/lib/child-service", () => ({
  getChild: (...args: unknown[]) => getChild(...args),
  listChildren: vi.fn(),
  createChild: vi.fn(),
  updateChild: vi.fn(),
  addChildGuardian: vi.fn(),
  removeChildGuardian: vi.fn(),
}));

vi.mock("@/lib/event-service", () => ({
  getEvent: (...args: unknown[]) => getEvent(...args),
  listEvents: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  saveEventAttendance: (...args: unknown[]) => saveEventAttendance(...args),
}));

vi.mock("@/lib/giving-service", () => ({
  getGiving: (...args: unknown[]) => getGiving(...args),
  listGiving: vi.fn(),
  createGiving: vi.fn(),
  listGivingTypes: vi.fn(),
  createGivingType: vi.fn(),
}));

vi.mock("@/lib/expense-service", () => ({
  getExpense: (...args: unknown[]) => getExpense(...args),
  listExpenses: vi.fn(),
  createExpense: vi.fn(),
  listExpenseCategories: vi.fn(),
  createExpenseCategory: vi.fn(),
}));

vi.mock("@/lib/sermon-service", () => ({
  getSermon: (...args: unknown[]) => getSermon(...args),
  listSermons: vi.fn(),
  createSermon: vi.fn(),
  updateSermon: vi.fn(),
}));

vi.mock("@/lib/announcement-service", () => ({
  getAnnouncement: (...args: unknown[]) => getAnnouncement(...args),
  listAnnouncements: vi.fn(),
  createAnnouncement: vi.fn(),
  updateAnnouncement: vi.fn(),
}));

vi.mock("@/lib/report-service", () => ({
  getMembershipReport: (...args: unknown[]) => getMembershipReport(...args),
  getAttendanceReport: vi.fn(),
  getVisitorReport: vi.fn(),
  getEventReport: vi.fn(),
  getFinanceReport: (...args: unknown[]) => getFinanceReport(...args),
  membershipReportToCsv: vi.fn(),
  attendanceReportToCsv: vi.fn(),
  visitorReportToCsv: vi.fn(),
  eventReportToCsv: vi.fn(),
  financeReportToCsv: vi.fn(),
}));

vi.mock("@/lib/pastoral-service", () => ({
  getPastoralCase: (...args: unknown[]) => getPastoralCase(...args),
  listPastoralCases: vi.fn(),
  createPastoralCase: vi.fn(),
  updatePastoralCase: vi.fn(),
}));

vi.mock("@/lib/prayer-service", () => ({
  getPrayerRequest: (...args: unknown[]) => getPrayerRequest(...args),
  listPrayerRequests: vi.fn(),
  createPrayerRequest: vi.fn(),
  updatePrayerRequest: vi.fn(),
}));

const churchAdmin = {
  userId: "user-a",
  churchId: "church-a",
  permissions: ["members:manage", "members:read"],
  user: { isPlatformAdmin: false },
};

describe("tenant isolation routes", () => {
  beforeEach(() => {
    requireSession.mockReset().mockResolvedValue(churchAdmin);
    listChurches.mockReset();
    getMember.mockReset();
    createChurch.mockReset();
    getFamily.mockReset();
    getService.mockReset();
    saveServiceAttendance.mockReset();
    getVisitor.mockReset();
    getChurchUser.mockReset();
    getChurchRole.mockReset();
    exportMembersCsv.mockReset();
    getChild.mockReset();
    getEvent.mockReset();
    saveEventAttendance.mockReset();
    getGiving.mockReset();
    getExpense.mockReset();
    getSermon.mockReset();
    getAnnouncement.mockReset();
    getMembershipReport.mockReset();
    getFinanceReport.mockReset();
    getPastoralCase.mockReset();
    getPrayerRequest.mockReset();
  });

  it("does not let a church administrator list churches", async () => {
    listChurches.mockRejectedValue(new ForbiddenError());
    const { GET } = await import("@/app/api/v1/churches/route");
    const res = await GET(new NextRequest("http://localhost/api/v1/churches"));
    expect(res.status).toBe(403);
  });

  it("does not let a church administrator create a church", async () => {
    createChurch.mockRejectedValue(new ForbiddenError());
    const { POST } = await import("@/app/api/v1/churches/route");
    const req = new NextRequest("http://localhost/api/v1/churches", {
      method: "POST",
      body: JSON.stringify({
        name: "Other",
        slug: "other",
        admin: {
          name: "Ada",
          email: "ada@other.example",
          password: "A-new-pass-12",
        },
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns not found for another church's member id", async () => {
    getMember.mockRejectedValue(new NotFoundError());
    const { GET } = await import("@/app/api/v1/members/[id]/route");
    const res = await GET(new NextRequest("http://localhost/api/v1/members/member-b"), {
      params: Promise.resolve({ id: "member-b" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns not found for another church's family id", async () => {
    getFamily.mockRejectedValue(new NotFoundError());
    const { GET } = await import("@/app/api/v1/families/[id]/route");
    const res = await GET(
      new NextRequest("http://localhost/api/v1/families/family-b"),
      { params: Promise.resolve({ id: "family-b" }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns not found for another church's service id", async () => {
    getService.mockRejectedValue(new NotFoundError());
    const { GET } = await import("@/app/api/v1/services/[id]/route");
    const res = await GET(
      new NextRequest("http://localhost/api/v1/services/service-b"),
      { params: Promise.resolve({ id: "service-b" }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns not found for another church's visitor id", async () => {
    getVisitor.mockRejectedValue(new NotFoundError());
    const { GET } = await import("@/app/api/v1/visitors/[id]/route");
    const res = await GET(
      new NextRequest("http://localhost/api/v1/visitors/visitor-b"),
      { params: Promise.resolve({ id: "visitor-b" }) },
    );
    expect(res.status).toBe(404);
  });

  it("rejects attendance counts that include a member id", async () => {
    const { PUT } = await import("@/app/api/v1/services/[id]/attendance/route");
    const res = await PUT(
      new NextRequest("http://localhost/api/v1/services/service-a/attendance", {
        method: "PUT",
        body: JSON.stringify({
          memberId: "22222222-2222-4222-8222-222222222222",
          items: [
            {
              attendanceCategoryId: "11111111-1111-4111-8111-111111111111",
              count: 10,
            },
          ],
        }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "service-a" }) },
    );
    expect(res.status).toBe(400);
    expect(saveServiceAttendance).not.toHaveBeenCalled();
  });

  it("rejects negative attendance counts", async () => {
    const { PUT } = await import("@/app/api/v1/services/[id]/attendance/route");
    const res = await PUT(
      new NextRequest("http://localhost/api/v1/services/service-a/attendance", {
        method: "PUT",
        body: JSON.stringify({
          items: [
            {
              attendanceCategoryId: "11111111-1111-4111-8111-111111111111",
              count: -1,
            },
          ],
        }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "service-a" }) },
    );
    expect(res.status).toBe(400);
    expect(saveServiceAttendance).not.toHaveBeenCalled();
  });

  it("returns not found for another church's user id", async () => {
    getChurchUser.mockRejectedValue(new NotFoundError());
    const { GET } = await import("@/app/api/v1/users/[id]/route");
    const res = await GET(
      new NextRequest("http://localhost/api/v1/users/user-b"),
      { params: Promise.resolve({ id: "user-b" }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns not found for another church's role id", async () => {
    getChurchRole.mockRejectedValue(new NotFoundError());
    const { GET } = await import("@/app/api/v1/roles/[id]/route");
    const res = await GET(
      new NextRequest("http://localhost/api/v1/roles/role-b"),
      { params: Promise.resolve({ id: "role-b" }) },
    );
    expect(res.status).toBe(404);
  });

  it("rejects member export without members:export", async () => {
    exportMembersCsv.mockRejectedValue(new ForbiddenError());
    const { GET } = await import("@/app/api/v1/members/export/route");
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns not found for another church's child id", async () => {
    getChild.mockRejectedValue(new NotFoundError());
    const { GET } = await import("@/app/api/v1/children/[id]/route");
    const res = await GET(
      new NextRequest("http://localhost/api/v1/children/child-b"),
      { params: Promise.resolve({ id: "child-b" }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns not found for another church's event id", async () => {
    getEvent.mockRejectedValue(new NotFoundError());
    const { GET } = await import("@/app/api/v1/events/[id]/route");
    const res = await GET(
      new NextRequest("http://localhost/api/v1/events/event-b"),
      { params: Promise.resolve({ id: "event-b" }) },
    );
    expect(res.status).toBe(404);
  });

  it("rejects event attendance that includes a member id", async () => {
    const { PUT } = await import("@/app/api/v1/events/[id]/attendance/route");
    const res = await PUT(
      new NextRequest("http://localhost/api/v1/events/event-a/attendance", {
        method: "PUT",
        body: JSON.stringify({
          memberId: "22222222-2222-4222-8222-222222222222",
          attendanceCount: 40,
        }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "event-a" }) },
    );
    expect(res.status).toBe(400);
    expect(saveEventAttendance).not.toHaveBeenCalled();
  });

  it("rejects a negative event attendance count", async () => {
    const { PUT } = await import("@/app/api/v1/events/[id]/attendance/route");
    const res = await PUT(
      new NextRequest("http://localhost/api/v1/events/event-a/attendance", {
        method: "PUT",
        body: JSON.stringify({ attendanceCount: -1 }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "event-a" }) },
    );
    expect(res.status).toBe(400);
    expect(saveEventAttendance).not.toHaveBeenCalled();
  });

  it("returns not found for another church's giving id", async () => {
    getGiving.mockRejectedValue(new NotFoundError());
    const { GET } = await import("@/app/api/v1/giving/[id]/route");
    const res = await GET(
      new NextRequest("http://localhost/api/v1/giving/giving-b"),
      { params: Promise.resolve({ id: "giving-b" }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns not found for another church's expense id", async () => {
    getExpense.mockRejectedValue(new NotFoundError());
    const { GET } = await import("@/app/api/v1/expenses/[id]/route");
    const res = await GET(
      new NextRequest("http://localhost/api/v1/expenses/expense-b"),
      { params: Promise.resolve({ id: "expense-b" }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns not found for another church's sermon id", async () => {
    getSermon.mockRejectedValue(new NotFoundError());
    const { GET } = await import("@/app/api/v1/sermons/[id]/route");
    const res = await GET(
      new NextRequest("http://localhost/api/v1/sermons/sermon-b"),
      { params: Promise.resolve({ id: "sermon-b" }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns not found for another church's announcement id", async () => {
    getAnnouncement.mockRejectedValue(new NotFoundError());
    const { GET } = await import("@/app/api/v1/announcements/[id]/route");
    const res = await GET(
      new NextRequest("http://localhost/api/v1/announcements/announcement-b"),
      { params: Promise.resolve({ id: "announcement-b" }) },
    );
    expect(res.status).toBe(404);
  });

  it("does not pass a churchId query into the membership report", async () => {
    getMembershipReport.mockResolvedValue({
      total: 0,
      byStatus: [],
      byZone: [],
    });
    const { GET } = await import("@/app/api/v1/reports/membership/route");
    await GET(
      new NextRequest(
        "http://localhost/api/v1/reports/membership?churchId=church-b",
      ),
    );
    expect(getMembershipReport).toHaveBeenCalledWith(churchAdmin);
  });

  it("rejects the finance report without finance:read", async () => {
    getFinanceReport.mockRejectedValue(new ForbiddenError());
    const { GET } = await import("@/app/api/v1/reports/finance/route");
    const res = await GET(
      new NextRequest("http://localhost/api/v1/reports/finance"),
    );
    expect(res.status).toBe(403);
  });

  it("returns not found for another church's pastoral case id", async () => {
    getPastoralCase.mockRejectedValue(new NotFoundError());
    const { GET } = await import("@/app/api/v1/pastoral/[id]/route");
    const res = await GET(
      new NextRequest("http://localhost/api/v1/pastoral/case-b"),
      { params: Promise.resolve({ id: "case-b" }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns not found for another church's prayer request id", async () => {
    getPrayerRequest.mockRejectedValue(new NotFoundError());
    const { GET } = await import("@/app/api/v1/prayer-requests/[id]/route");
    const res = await GET(
      new NextRequest("http://localhost/api/v1/prayer-requests/prayer-b"),
      { params: Promise.resolve({ id: "prayer-b" }) },
    );
    expect(res.status).toBe(404);
  });
});
