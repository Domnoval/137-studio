"use client";

import React from "react";

export function CRTOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 3px)",
          boxShadow: "inset 0 0 150px rgba(0,0,0,0.5)",
          borderRadius: "12px",
        }}
      />
    </div>
  );
}

export function CRTText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={className}
      style={{
        textShadow: "0.5px 0 rgba(255,0,0,0.15), -0.5px 0 rgba(0,255,255,0.15)",
      }}
    >
      {children}
    </span>
  );
}
