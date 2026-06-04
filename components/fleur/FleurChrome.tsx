"use client";

import { CustomCursor } from "./CustomCursor";

export function FleurChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CustomCursor />
      <div className="cursor" id="cursor" aria-hidden />
      <div className="cursor-ring" id="cursorRing" aria-hidden />
      {children}
    </>
  );
}
