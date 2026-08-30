import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_SIZE,
  LOOKUP_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  buildListSearchParams,
  parseListParams,
  resolvePagination,
} from "./pagination";

describe("pagination", () => {
  it("resolves defaults and caps page size", () => {
    expect(resolvePagination({})).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      skip: 0,
      take: DEFAULT_PAGE_SIZE,
    });
    expect(resolvePagination({ page: 0, pageSize: 999 })).toEqual({
      page: 1,
      pageSize: LOOKUP_PAGE_SIZE,
      skip: 0,
      take: LOOKUP_PAGE_SIZE,
    });
    expect(resolvePagination({ page: 3, pageSize: 10 })).toEqual({
      page: 3,
      pageSize: 10,
      skip: 20,
      take: 10,
    });
  });

  it("parses list query params from URLSearchParams", () => {
    const params = new URLSearchParams("q=grace&page=2&pageSize=50");
    expect(parseListParams(params)).toEqual({
      q: "grace",
      page: 2,
      pageSize: 50,
      skip: 50,
      take: 50,
    });
  });

  it("omits blank search terms", () => {
    const params = new URLSearchParams("q=%20%20");
    expect(parseListParams(params).q).toBeUndefined();
  });

  it("builds list search params for fetch URLs", () => {
    expect(
      buildListSearchParams({ q: "john", page: 2, pageSize: PAGE_SIZE_OPTIONS[0] }),
    ).toBe("q=john&page=2&pageSize=10");
  });
});
