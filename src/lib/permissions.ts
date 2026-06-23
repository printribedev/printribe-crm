import { prisma } from "@/lib/prisma";

export type PermAction = "create" | "edit" | "delete";

export async function checkPerm(userId: string, section: string, action: PermAction): Promise<boolean> {
  const perm = await prisma.userPermission.findUnique({ where: { userId } });
  if (!perm) return true; // no row = full access (e.g. owner before seeding)
  if (perm.role === "admin") return true;
  const sections = perm.sections as Record<string, unknown>;
  const key = `${section}.${action}`;
  return sections[key] !== false;
}
