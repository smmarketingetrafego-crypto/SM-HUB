import { describe, expect, it } from "vitest";
import { notificationRecipients } from "./notification-rules";

describe("notificationRecipients", () => {
  it("notifies the account owner and the founder when a team member creates something", () => {
    expect(notificationRecipients("owner", ["founder"], "member")).toEqual(["owner", "founder"]);
  });
  it("does not notify the person who created it", () => {
    expect(notificationRecipients("owner", ["founder"], "owner")).toEqual(["founder"]);
  });
  it("sends one notice when the founder owns the account", () => {
    expect(notificationRecipients("founder", ["founder"], "member")).toEqual(["founder"]);
  });
});
