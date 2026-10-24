import fallbackFace from "./assets/ojisan.svg";

// Uploadede billeder skaleres ned til et kvadrat (max tile-størrelse på retina ~ 512px)
const MAX_FACE_SIZE = 512;
// Et 12 MP-foto fylder ~50 MB dekodet – dekod kun få ad gangen, så mobilen ikke løber tør for hukommelse
const DECODE_CONCURRENCY = 3;
const DB_NAME = "angry-ojisan";
const STORE = "faces";

export interface Face {
  id: string;
  url: string;
}

export const FALLBACK_FACE: Face = { id: "fallback", url: fallbackFace };

// -------- IndexedDB, så ansigter overlever en genindlæsning --------
let dbPromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

// Én transaktion til hele operationen; resolver når den er committed
async function tx(mode: IDBTransactionMode, run: (store: IDBObjectStore) => void) {
  const t = (await db()).transaction(STORE, mode);
  run(t.objectStore(STORE));
  return new Promise<void>((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = t.onabort = () => reject(t.error);
  });
}

export async function loadSavedFaces(): Promise<Face[]> {
  const faces: Face[] = [];
  try {
    await tx("readonly", (s) => {
      s.openCursor().onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (!cursor) return;
        faces.push({ id: String(cursor.key), url: URL.createObjectURL(cursor.value as Blob) });
        cursor.continue();
      };
    });
  } catch {
    /* Privat browsing o.l. - kør videre uden persistens */
  }
  return faces;
}

export async function clearFaces(faces: Face[]) {
  faces.forEach((f) => URL.revokeObjectURL(f.url));
  try {
    await tx("readwrite", (s) => s.clear());
  } catch {
    /* ingen persistens */
  }
}

export async function deleteFace(face: Face) {
  URL.revokeObjectURL(face.url);
  try {
    await tx("readwrite", (s) => s.delete(face.id));
  } catch {
    /* ingen persistens */
  }
}

// Kør fn over items med højst `limit` samtidige kald
async function mapSettled<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i]) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Ét dårligt billede stopper ikke de andre
export async function addFaces(
  files: File[]
): Promise<{ faces: Face[]; failed: number }> {
  const results = await mapSettled(files, DECODE_CONCURRENCY, toFaceBlob);
  const faces: Face[] = [];
  const blobs: [string, Blob][] = [];
  let failed = 0;
  const stamp = Date.now();

  for (const [i, res] of results.entries()) {
    if (res.status === "rejected") {
      failed++;
      continue;
    }
    // Polstret indeks, så nøglerne sorterer i upload-rækkefølge
    const id = `${stamp}-${String(i).padStart(4, "0")}`;
    faces.push({ id, url: URL.createObjectURL(res.value) });
    blobs.push([id, res.value]);
  }
  try {
    await tx("readwrite", (s) => blobs.forEach(([id, blob]) => s.put(blob, id)));
  } catch {
    /* ingen persistens */
  }
  return { faces, failed };
}

// Centreret, nedskaleret kvadrat-udsnit som JPEG
async function toFaceBlob(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  const canvas = document.createElement("canvas");
  try {
    img.src = url;
    await img.decode();

    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const out = Math.min(side, MAX_FACE_SIZE);
    canvas.width = canvas.height = out;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      out,
      out
    );
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        0.88
      )
    );
  } finally {
    // Frigiv den dekodede fuld-opløsnings-bitmap med det samme
    URL.revokeObjectURL(url);
    img.src = "";
    canvas.width = canvas.height = 0;
  }
}
