import { getTableName, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * Always-qualified column reference ("table"."column") for correlated subqueries.
 *
 * In a select from a single table, Drizzle renders `${table.id}` inside sql`` as a bare "id". Inside
 * `(select ... from submissions s where s.mission_id = "id")` Postgres then picks the INNER table's
 * id: the count is silently wrong (or the query fails as ambiguous when the subquery joins tables).
 */
export function ref(column: AnyPgColumn): SQL {
  return sql`${sql.identifier(getTableName(column.table))}.${sql.identifier(column.name)}`;
}
