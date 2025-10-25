"use client";

import React, { useEffect, useRef, useState } from "react";

type StatusVariant = "info" | "success" | "error";

export default function LiveStatusBar() {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");
  const [variant, setVariant] = useState<StatusVariant>("info");
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const bc = new BroadcastChannel("appointments-updates");
    bcRef.current = bc;

    bc.onmessage = (ev: MessageEvent) => {
      const msg: any = ev.data;
      if (!msg || typeof msg !== "object") return;

      const payload = msg.payload || {};
      const doctorName = payload.doctorName || (payload.doctorId ? `Doctor #${payload.doctorId}` : "Doctor");
      const date = payload.date || "";
      const time = payload.time || "";

      if (msg.type === "appointment-pending") {
        setText(`Booking request sent for ${date} at ${time} — confirming…`);
        setVariant("info");
        setVisible(true);
        resetHideTimer(4500);
      } else if (msg.type === "appointment-booked") {
        setText(`Appointment confirmed with ${doctorName} on ${date} at ${time}.`);
        setVariant("success");
        setVisible(true);
        resetHideTimer(6000);
      } else if (msg.type === "appointment-failed") {
        const err = (msg.error as string) || "Booking failed";
        setText(`${err}. Please try again.`);
        setVariant("error");
        setVisible(true);
        resetHideTimer(7000);
      }
    };

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      bc.close();
    };
  }, []);

  function resetHideTimer(ms: number) {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setVisible(false), ms);
  }

  if (!visible) return null;

  const bg = variant === "success" ? "bg-green-600" : variant === "error" ? "bg-red-600" : "bg-blue-600";
  const border = variant === "success" ? "border-green-500" : variant === "error" ? "border-red-500" : "border-blue-500";

  return (
    <div className={`fixed left-0 right-0 top-16 z-50 px-4`}> 
      <div className={`max-w-7xl mx-auto ${bg} text-white border ${border} rounded-xl shadow-lg flex items-center justify-between px-4 py-3`}> 
        <div className="flex items-center gap-2">
          {variant === "success" && <span>✅</span>}
          {variant === "info" && <span>⏳</span>}
          {variant === "error" && <span>⚠️</span>}
          <span className="font-semibold">{text}</span>
        </div>
        <button
          aria-label="Dismiss"
          className="text-white/90 hover:text-white"
          onClick={() => setVisible(false)}
        >
          ✖
        </button>
      </div>
    </div>
  );
}