import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { aggregate, dataCsv, isDataView, recyclingCsv } from "@/lib/impact";
import { loadImpactRows } from "@/lib/impact-server";

export const dynamic = "force-dynamic";

/**
 * Admin CSV exports (docs/MONETIZACAO.md):
 *   /api/admin/export/recycling   verified deliveries, one per line, without names
 *   /api/admin/export/data-city   anonymous aggregates (also data-month, data-category, data-grid)
 */
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" || user.isBanned) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { kind } = await params;
  const day = new Date().toISOString().slice(0, 10);

  let csv: string;
  let name: string;
  if (kind === "recycling") {
    csv = recyclingCsv(await loadImpactRows());
    name = `ecoverify-coletas-${day}.csv`;
  } else if (kind.startsWith("data-") && isDataView(kind.slice(5))) {
    const view = kind.slice(5) as Parameters<typeof aggregate>[1];
    csv = dataCsv(aggregate(await loadImpactRows(), view));
    name = `ecoverify-dados-${view}-${day}.csv`;
  } else {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
