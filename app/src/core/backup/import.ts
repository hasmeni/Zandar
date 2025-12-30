import { db, Page, Widget, Link } from "../db/db";
import { BACKUP_VERSION } from "../../constants/backup";

interface BackupData {
  pages: Page[];
  widgets: Widget[];
  links: Link[];
}

interface BackupJSON {
  version: string;
  timestamp: string;
  data: BackupData;
}

// Return types for the UI
export interface ImportStats {
  pagesImported: number;
  widgetsImported: number;
  linksImported: number;
}

export type ImportResult =
  | { success: true; stats: ImportStats; backupVersion: string; backupTimestamp: string }
  | { success: false; error: string };

// Validate backup file structure
const validateBackupStructure = (backup: any): boolean => {
  if (!backup.version || typeof backup !== "object") {
    return false;
  }

  if (backup.version !== BACKUP_VERSION) {
    throw new Error(`Incompatible backup version. Expected ${BACKUP_VERSION}, got ${backup.version}`);  
  }

  // ensure 'data' exists and has array for all object
  const hasData = backup.data && typeof backup.data === "object";
  if (!hasData) return false;
  
  /// 
  const hasRequiredTables =
    Array.isArray(backup.data.pages) &&
    Array.isArray(backup.data.widgets) &&
    Array.isArray(backup.data.links);

  return hasRequiredTables;
};

// Parse JSON file content
const parseJsonFile = (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if ( typeof result !== 'string') {
          throw new Error("File content is not text")
        }
        const parsed = JSON.parse(result);
        resolve(parsed);
      } catch (error) {
        // pass the error up
        reject(error);      
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    reader.readAsText(file);
  });
};

// Import database from JSON file
export const importDatabase = async (file: File, clearExisting: boolean = true): Promise<ImportResult> => {
  try {
    // 1. Validate file type
    if (!file.name.endsWith(".json")) {
      throw new Error("Please select a JSON file");
    }

    // 2. Parse file
    const backupData = await parseJsonFile(file);

    // 3. Validate structure ( checks version and table arrays )
    if (!validateBackupStructure(backupData)) {
      throw new Error("Invalid backup file format");
    }

    const validData = backupData as BackupJSON;
    const { pages, widgets, links } = validData.data;

    // 4. THE TRANSACTION (The Safety Net)
    // 'rw' = ReadWrite transaction.
    // If ANY error happens inside here, Dexie undoes EVERYTHING (including the clear).
    const stats = await db.transaction(
      "rw",
      [db.pages, db.widgets, db.links],
      async () => {
        // A. Clear existing (if requested) default true
        // Wipe before importing ( merge could take some extra steps will try do it later version. )
        if (clearExisting) {
          await Promise.all([
            db.pages.clear(),
            db.widgets.clear(),
            db.links.clear(),
          ]);
        }

        // B. Bulk Add
        await db.pages.bulkAdd(pages);
        await db.widgets.bulkAdd(widgets);
        await db.links.bulkAdd(links);

        // Return stats for the UI
        return {
          pagesImported: pages.length,
          widgetsImported: widgets.length,
          linksImported: links.length,
        };
      },
    );

    return {
      success: true,
      stats,
      backupVersion: backupData.version,
      backupTimestamp: backupData.timestamp,
    };
  } catch (error) {
    // Standard error handling
    const errorMessage = error instanceof Error ? error.message : "Unknown import error";
    console.error("Import failed:", errorMessage);    
    
    return {
      success: false,
      error: errorMessage,
    };
  }
};
