"use server";

import { createClient } from "@/app/utils/supabase/server";
import { PostgrestError } from "@supabase/supabase-js";

// Define a type for the error objects we store
interface DbCheckError {
  source: string;
  error: PostgrestError | string | unknown;
}

// Define a type for the table info
interface TableInfo {
  exists: boolean;
  fields: string[];
  sample: any[] | null;
}

// Define the overall result structure
interface DbCheckResult {
  tables: Record<string, TableInfo>;
  errors: DbCheckError[];
}

export async function checkDatabaseStructure(): Promise<DbCheckResult> {
  const supabase = await createClient();
  const result: DbCheckResult = {
    tables: {},
    errors: [],
  };

  try {
    // Get a list of all tables
    const { data: tables, error: tablesError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public");

    if (tablesError) {
      result.errors.push({
        source: "tables_query",
        error: tablesError,
      });
      return result;
    }

    // For each table, get its columns
    for (const table of tables || []) {
      const tableName = table.table_name;

      try {
        // Try to get one row to see the structure
        const { data, error } = await supabase
          .from(tableName)
          .select("*", { head: false, count: "exact" })
          .limit(1);

        if (error) {
          result.errors.push({
            source: `${tableName}_query`,
            error,
          });
        } else {
          // Add table info to result
          result.tables[tableName] = {
            exists: true,
            fields: data && data.length > 0 ? Object.keys(data[0]) : [],
            sample: data,
          };
        }
      } catch (error: unknown) {
        // Catch unknown error type
        result.errors.push({
          source: `${tableName}_try_catch`,
          error: String(error), // Convert error to string
        });
      }
    }

    return result;
  } catch (error: unknown) {
    // Catch unknown error type
    result.errors.push({
      source: "general",
      error: String(error), // Convert error to string
    });
    return result;
  }
}
