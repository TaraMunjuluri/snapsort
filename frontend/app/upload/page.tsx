"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "./upload.module.css";

type Preview = { id: string; file: File; url: string };

export default function UploadPage() {
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      // cleanup object URLs
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  const uid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (incoming.length === 0) return;

    setPreviews((prev) => {
      const remaining = 10 - prev.length;
      if (remaining <= 0) {
        // gentle in-app notice
        return prev;
      }
      const toAdd = incoming.slice(0, remaining).map((file) => ({
        id: uid(),
        file,
        url: URL.createObjectURL(file),
      }));
      return [...prev, ...toAdd];
    });
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const clearAll = () => {
    previews.forEach((p) => URL.revokeObjectURL(p.url));
    setPreviews([]);
  };

  const removeOne = (id: string) => {
    setPreviews((prev) => {
      const found = prev.find((p) => p.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-b from-black via-slate-900 to-slate-800 text-slate-100 p-2">
      {/* Header bar */}
      <header className="w-full max-w-md mx-auto mt-6 mb-4 px-4">
        <div className="rounded-3xl bg-transparent py-6 px-6 flex flex-col items-center">
          <div className="text-2xl font-extrabold tracking-tight">SnapSort</div>
          <div className="text-sm text-slate-400 mt-2">Upload your screenshots to start organizing</div>
        </div>
      </header>

      <main className="w-full max-w-md mx-auto pb-40 px-4">
        <section className="rounded-3xl bg-slate-900/30 backdrop-blur-md p-6">

          {/* compact upload card */}
          <div className="flex items-center justify-center">
            <div className={`w-full max-w-sm rounded-2xl ${styles.innerCard}`} onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}>
              <div className="flex flex-col items-center">
                <div className={`${styles.uploadArrow}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#e6eef8" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V6"/><path d="M5 12l7-7 7 7"/></svg>
                </div>
                <div className="mt-2">
                  <button className={`${styles.selectBtn} bg-gradient-to-r from-indigo-500 to-blue-500 text-white`}>Select from Gallery</button>
                </div>
                <div className="text-xs text-slate-400 mt-3 text-center">Upload up to 10 screenshots. Files stay local.</div>
              </div>
              <input ref={inputRef} type="file" accept="image/png, image/jpeg, image/jpg" multiple className="hidden" onChange={onInputChange} />
            </div>
          </div>

          {/* counter and clear */}
          <div className="flex items-center justify-between mt-3 mb-2">
            <div></div>
            <div className="text-sm text-slate-400">{previews.length} / 10 uploaded</div>
          </div>

          {/* images grid: 2-column mobile */}
          <div className="relative">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {previews.map((p) => (
                <div key={p.id} className={`relative rounded-xl overflow-hidden ${styles.cardShadow} ${styles.imgEnter}`}>
                  <button onClick={() => removeOne(p.id)} aria-label={`Remove ${p.file.name}`} className="absolute z-20 right-2 top-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm hover:bg-red-600 transition-colors">×</button>
                  <img src={p.url} alt={p.file.name} className="w-full h-40 object-cover block rounded-xl tap-scale" />
                </div>
              ))}
            </div>
            {/* top-right upload counter overlay */}
            {previews.length > 0 && (
              <div className="absolute right-0 -top-10 text-sm text-slate-400">{previews.length} / 10 uploaded</div>
            )}
          </div>

          {/* demo carousel showing what SnapSort does */}
          <DemoShowcase />
        </section>
      </main>

      {/* floating Continue button when images present */}
      {previews.length > 0 && (
        <div className={styles.continueFull}>
          <button className={`${styles.continueFull} bg-gradient-to-r from-indigo-500 to-violet-500 text-white`} aria-label="Continue">Continue</button>
        </div>
      )}
    </div>
  );
}

function DemoShowcase() {
  // Load images from `public/` (filenames with spaces are URL-encoded as %20).
  const images = [
    "/tshirt.png",
    "/price%20extraction.png",
    "/organized%20screenshots.png",
  ];
  const captions = [
    "Product / screenshot — T-shirt listing",
    "Price extraction and receipt parsing",
    "Automatically organized screenshots",
  ];

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % images.length), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mt-4 flex flex-col items-center">
      <div className="caption mb-2">{captions[idx]}</div>
      <div className="demoSlide">
        <img key={idx} src={images[idx]} alt={`Demo ${idx + 1}`} className={`${styles.imgEnter}`} />
      </div>
    </div>
  );
}
