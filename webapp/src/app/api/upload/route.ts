import { NextResponse } from "next/server";
import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
// Allow large Instagram export zips
export const maxDuration = 60;

const DATA_ROOT = path.join(process.cwd(), "..", "data");

export async function POST(request: Request): Promise<NextResponse<{ success: boolean; error?: string }>> {
  try {
    // Read the raw body — avoids the formData() size limit
    const arrayBuffer = await request.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    const fileName = request.headers.get("x-file-name") ?? "upload.zip";
    if (!fileName.endsWith(".zip")) {
      return NextResponse.json(
        { success: false, error: "Only .zip files are accepted" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(arrayBuffer);

    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    // Find the Instagram export root folder inside the zip
    // Typically: instagram-<username>-<date>-<id>/
    let exportPrefix = "";
    for (const entry of entries) {
      if (entry.entryName.startsWith("instagram-") && entry.isDirectory) {
        exportPrefix = entry.entryName;
        break;
      }
    }

    // If no instagram- prefix found, files are at root level.
    // Instagram splits exports into multiple zips — not all contain connections/.
    // Accept any zip that has known Instagram export directories.
    if (!exportPrefix) {
      const knownDirs = [
        "connections/", "your_instagram_activity/", "personal_information/",
        "logged_information/", "media/", "ads_information/", "preferences/",
        "security_and_login_information/", "apps_and_websites_off_of_instagram/",
      ];
      const looksLikeExport = entries.some((e) =>
        knownDirs.some((d) => e.entryName.startsWith(d) || e.entryName.includes(`/${d}`))
      );
      if (!looksLikeExport) {
        return NextResponse.json(
          { success: false, error: "This zip does not look like an Instagram export" },
          { status: 400 }
        );
      }
      exportPrefix = "";
    }

    // Clean previous export folders in data/ (unless keepExisting is set)
    const url = new URL(request.url);
    const keepExisting = url.searchParams.get("keepExisting") === "1";
    if (!keepExisting && fs.existsSync(DATA_ROOT)) {
      const existing = fs.readdirSync(DATA_ROOT);
      for (const dir of existing) {
        const full = path.join(DATA_ROOT, dir);
        if (fs.statSync(full).isDirectory() && dir.startsWith("instagram-")) {
          fs.rmSync(full, { recursive: true, force: true });
        }
      }
    }

    // Ensure data directory exists
    fs.mkdirSync(DATA_ROOT, { recursive: true });

    // Determine target folder name
    let targetFolder: string;
    if (keepExisting) {
      // When merging, reuse the first existing instagram- folder if present
      const existingDirs = fs.existsSync(DATA_ROOT)
        ? fs.readdirSync(DATA_ROOT).filter(
            (e) => fs.statSync(path.join(DATA_ROOT, e)).isDirectory() && e.startsWith("instagram-")
          )
        : [];
      if (existingDirs.length > 0) {
        targetFolder = existingDirs[0];
      } else if (exportPrefix) {
        targetFolder = exportPrefix.replace(/\/$/, "");
      } else {
        const baseName = fileName.replace(/\.zip$/, "");
        targetFolder = baseName.startsWith("instagram-") ? baseName : `instagram-${baseName}`;
      }
    } else if (exportPrefix) {
      // Use the folder name from the zip
      targetFolder = exportPrefix.replace(/\/$/, "");
    } else {
      // Create a folder based on the zip filename
      const baseName = fileName.replace(/\.zip$/, "");
      targetFolder = baseName.startsWith("instagram-") ? baseName : `instagram-${baseName}`;
    }

    const targetPath = path.join(DATA_ROOT, targetFolder);
    fs.mkdirSync(targetPath, { recursive: true });

    // Extract files
    for (const entry of entries) {
      if (entry.isDirectory) continue;

      let relativePath = entry.entryName;
      // Strip the export prefix if present
      if (exportPrefix && relativePath.startsWith(exportPrefix)) {
        relativePath = relativePath.slice(exportPrefix.length);
      }
      if (!relativePath) continue;

      const outPath = path.join(targetPath, relativePath);
      const outDir = path.dirname(outPath);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(outPath, entry.getData());
    }

    // Files extracted successfully. The client will re-fetch /api/data to get parsed analytics.
    // We deliberately do NOT parse here — parsing all ZIPs at once (after merge) is more reliable.
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in /api/upload:", error);
    const message = error instanceof Error ? error.message : "Erreur lors de l'import";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
