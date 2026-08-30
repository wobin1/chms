import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { parseSelectOptions } from "./select";

describe("parseSelectOptions", () => {
  it("reads value and label from option children", () => {
    const options = parseSelectOptions(
      [
        createElement("option", { key: "all", value: "" }, "All zones"),
        createElement("option", { key: "z1", value: "z1" }, "North"),
        createElement(
          "option",
          { key: "z2", value: "z2", disabled: true },
          "South",
        ),
      ],
    );

    expect(options).toEqual([
      { value: "", label: "All zones", disabled: undefined },
      { value: "z1", label: "North", disabled: undefined },
      { value: "z2", label: "South", disabled: true },
    ]);
  });

  it("supports mapped option children", () => {
    const options = parseSelectOptions(
      [{ id: "a", name: "Alpha" }].map((row) =>
        createElement("option", { key: row.id, value: row.id }, row.name),
      ),
    );

    expect(options).toEqual([{ value: "a", label: "Alpha", disabled: undefined }]);
  });
});
