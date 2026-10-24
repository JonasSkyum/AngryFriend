import fallbackFace from "./assets/ojisan.svg";

// Uploadede billeder skaleres ned til et kvadrat (max tile-størrelse på retina ~ 512px)
const MAX_FACE_SIZE = 512;
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

async function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const store = (await db()).transaction(STORE, mode).objectStore(STORE);
  return new Promise((resolve, reject) => {
    const req = run(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadSavedFaces(): Promise<Face[]> {
  try {
    const [keys, blobs] = await Promise.all([
      tx("readonly", (s) => s.getAllKeys()),
      tx("readonly", (s) => s.getAll() as IDBRequest<Blob[]>),
    ]);
    return blobs.map((blob, i) => ({
      id: String(keys[i]),
      url: URL.createObjectURL(blob),
    }));
  } catch {
    return []; // Privat browsing o.l. - kør videre uden persistens
  }
}

export async function clearFaces(faces: Face[]) {
  faces.forEach((f) => URL.revokeObjectURL(f.url));
  try {
    await tx("readwrite", (s) => s.clear());
  } catch {
    /* ingen persistens */
  }
}

// Indlæs filer parallelt; ét dårligt billede stopper ikke de andre
export async function addFaces(
  files: File[]
): Promise<{ faces: Face[]; failed: number }> {
  const results = await Promise.allSettled(files.map(toFaceBlob));
  const faces: Face[] = [];
  let failed = 0;
  const stamp = Date.now();

  for (const [i, res] of results.entries()) {
    if (res.status === "rejected") {
      failed++;
      continue;
    }
    const id = `${stamp}-${i}`;
    faces.push({ id, url: URL.createObjectURL(res.value) });
    try {
      await tx("readwrite", (s) => s.put(res.value, id));
    } catch {
      /* ingen persistens */
    }
  }
  return { faces, failed };
}

// Centreret, nedskaleret kvadrat-udsnit som JPEG
async function toFaceBlob(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();

    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const out = Math.min(side, MAX_FACE_SIZE);
    const canvas = document.createElement("canvas");
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
    URL.revokeObjectURL(url);
  }
}
