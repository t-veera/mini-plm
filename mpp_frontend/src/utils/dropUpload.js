// Read files dropped from the OS (Explorer/Finder) into a flat list, preserving the
// folder structure of any dropped directories via `relativePath` (POSIX-style, e.g.
// "repo/src/main.c"). Top-level files have a relativePath equal to their name.
//
// The DataTransferItemList is only valid synchronously during the drop event, so we
// grab every entry up front, then walk the directory trees asynchronously.

const MAX_ENTRIES = 5000; // safety cap so a huge accidental drop can't hang the browser

// Directories that are version-control internals, dependency/build caches, or editor
// cruft — skipped entirely on drop (not descended into) so a cloned repo doesn't upload
// thousands of junk files or blow up the disk. Matched case-insensitively by name.
const IGNORE_DIRS = new Set([
  '.git', '.svn', '.hg', '.cache', 'node_modules', '__pycache__',
  '.pytest_cache', '.mypy_cache', '.tox', '.venv', 'venv', '.idea', '.vscode',
  '.next', '.turbo', '.gradle', '.terraform',
  '.pio', '.vs', 'cmake-build-debug', 'cmake-build-release', '.parcel-cache', // build caches
]);
const IGNORE_FILES = new Set(['.ds_store', 'thumbs.db', 'desktop.ini']);

const isIgnoredDir = (name) => IGNORE_DIRS.has((name || '').toLowerCase());
const isIgnoredFile = (name) => IGNORE_FILES.has((name || '').toLowerCase());
// A path is ignored if any of its directory segments is an ignored dir.
const pathHasIgnoredSegment = (relativePath) => {
  const parts = relativePath.split('/');
  return parts.slice(0, -1).some(isIgnoredDir) || isIgnoredFile(parts[parts.length - 1]);
};

// Exposed so the "Upload folder" picker (webkitdirectory) can apply the same skip rules.
export const isIgnoredDropPath = pathHasIgnoredSegment;

function readEntryFile(entry) {
  return new Promise((resolve, reject) => {
    entry.file(
      (file) => resolve(file),
      (err) => reject(err),
    );
  });
}

function readAllDirEntries(reader) {
  // readEntries returns results in batches; keep calling until it returns empty.
  return new Promise((resolve, reject) => {
    const all = [];
    const read = () => {
      reader.readEntries((batch) => {
        if (!batch.length) { resolve(all); return; }
        all.push(...batch);
        read();
      }, reject);
    };
    read();
  });
}

async function walkEntry(entry, prefix, out) {
  if (out.length >= MAX_ENTRIES) return;
  if (entry.isFile) {
    if (isIgnoredFile(entry.name)) return;
    const file = await readEntryFile(entry);
    out.push({ file, relativePath: prefix ? `${prefix}/${entry.name}` : entry.name });
  } else if (entry.isDirectory) {
    if (isIgnoredDir(entry.name)) return; // skip .git, .cache, .pio, node_modules, ...
    const reader = entry.createReader();
    const children = await readAllDirEntries(reader);
    const childPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
    // Walk siblings in parallel: dropped-folder entries expire shortly after the drop
    // event, so a slow sequential walk of a big repo loses everything past the first
    // few entries. Reading concurrently finishes fast enough to capture the whole tree.
    await Promise.all(children.map(child => walkEntry(child, childPrefix, out)));
  }
}

/**
 * @returns {Promise<Array<{file: File, relativePath: string}>>}
 */
export async function readDropEntries(dataTransfer) {
  const items = dataTransfer && dataTransfer.items ? Array.from(dataTransfer.items) : [];
  const supportsEntries = items.length > 0 && typeof items[0].webkitGetAsEntry === 'function';

  if (supportsEntries) {
    // Snapshot entries synchronously (they expire after the event handler returns).
    const entries = items
      .filter((it) => it.kind === 'file')
      .map((it) => it.webkitGetAsEntry())
      .filter(Boolean);
    if (entries.length) {
      const out = [];
      for (const entry of entries) {
        await walkEntry(entry, '', out);
      }
      return out;
    }
  }

  // Fallback: no directory support — treat as a flat list of files.
  const files = dataTransfer && dataTransfer.files ? Array.from(dataTransfer.files) : [];
  return files
    .map((file) => ({ file, relativePath: file.webkitRelativePath || file.name }))
    .filter((e) => !pathHasIgnoredSegment(e.relativePath));
}

export function hasExternalFiles(dataTransfer) {
  if (!dataTransfer) return false;
  const types = dataTransfer.types || [];
  return Array.from(types).includes('Files');
}
