import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

const sendMailMock = vi.fn().mockResolvedValue({ messageId: "test-id" });

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: sendMailMock })),
  },
}));

beforeAll(() => {
  process.env.SMTP_HOST = "smtp.test.example.com";
  process.env.SMTP_PORT = "587";
  process.env.SMTP_USER = "test@example.com";
  process.env.SMTP_PASS = "testpass";
  process.env.MAIL_FROM = "no-reply@leafflow.com";
});

describe("sendOtpEmail", () => {
  beforeEach(() => {
    sendMailMock.mockClear();
  });

  it("calls sendMail with correct recipient and subject", async () => {
    const { sendOtpEmail } = await import("../../src/services/email");
    await sendOtpEmail("user@example.com", "123456");

    expect(sendMailMock).toHaveBeenCalledOnce();
    const [mailOptions] = sendMailMock.mock.calls[0];
    expect(mailOptions.to).toBe("user@example.com");
    expect(mailOptions.subject).toBe("Your LeafFlow OTP");
  });

  it("includes the OTP in the email body", async () => {
    const { sendOtpEmail } = await import("../../src/services/email");
    await sendOtpEmail("user@example.com", "654321");

    const [mailOptions] = sendMailMock.mock.calls[0];
    expect(mailOptions.text).toContain("654321");
  });

  it("throws if SMTP_HOST is missing", async () => {
    const orig = process.env.SMTP_HOST;
    delete process.env.SMTP_HOST;
    await expect(import("../../src/services/email?bust=" + Date.now())).rejects.toThrow("SMTP_HOST is not set");
    process.env.SMTP_HOST = orig;
  });
});
