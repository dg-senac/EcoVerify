/** Contact form validation, shared by the server action and the offline demo. */
import { LEAD_TYPES, type LeadType } from "@/lib/marketing-text";
import { isPlanId, type PlanId } from "@/lib/plans";

export interface LeadInput {
  name: string;
  email: string;
  organization: string;
  type: string;
  plan?: string | null;
  message?: string | null;
  /** Honeypot: real people leave it empty. */
  website?: string | null;
}

export interface CleanLead {
  name: string;
  email: string;
  organization: string;
  type: LeadType;
  plan: PlanId | null;
  message: string | null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cleanLead(input: LeadInput): CleanLead | null {
  const name = String(input.name ?? "").trim();
  const email = String(input.email ?? "").trim().toLowerCase();
  const organization = String(input.organization ?? "").trim();
  const type = LEAD_TYPES.find((t) => t === input.type);
  const message = String(input.message ?? "").trim();
  if (!name || name.length > 80 || !EMAIL.test(email) || email.length > 160) return null;
  if (!organization || organization.length > 120 || !type || message.length > 2000) return null;
  return { name, email, organization, type, plan: isPlanId(input.plan) ? input.plan : null, message: message || null };
}
