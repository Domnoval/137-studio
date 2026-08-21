"use client";

import { useEffect } from "react";
import { useMachine } from "@/lib/machineStore";
import { seedOpeningLines } from "@/lib/machineStore";
import { LEVER_NAMES, STATE_TABLE } from "@/lib/stateTable";
import { PRESS_STORE_URL } from "@/lib/site";

const FOCUS_BUTTONS = [
  ["console", "CONSOLE"],
  ["screen", "THE SCREEN"],
  ["ring", "THE RING"],
] as const;

export function Overlay() {
  const state = useMachine((s) => s.state);
  const bits = useMachine((s) => s.bits);
  const subjectId = useMachine((s) => s.subjectId);
  const visits = useMachine((s) => s.visits);
  const armed = useMachine((s) => s.armed);
  const events = useMachine((s) => s.events);
  const inCrt = useMachine((s) => s.inCrt);
  const enterCrt = useMachine((s) => s.enterCrt);
  const leaveCrt = useMachine((s) => s.leaveCrt);
  const flipLever = useMachine((s) => s.flipLever);
  const setState = useMachine((s) => s.setState);
  const setFocus = useMachine((s) => s.setFocus);
  const resetSubject = useMachine((s) => s.resetSubject);

  useEffect(() => {
    seedOpeningLines();
  }, []);

  // keyboard: 1-4 flip levers, E enter CRT, ESC leave
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (inCrt) {
        if (e.key === "Escape") leaveCrt();
        return;
      }
      if (e.key >= "1" && e.key <= "4") flipLever(Number(e.key) - 1);
      if (e.key === "e" || e.key === "E") enterCrt();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inCrt, flipLever, enterCrt, leaveCrt]);

  return (
    <>
      {/* ── the room HUD ─────────────────────────────────────────── */}
      <div className="hud">
        <div className="hud-top-left">
          <div className="state-name">{state.name}</div>
          <div className="bits">{bits.join("")}</div>
          <div className="signet-label">{state.signet}</div>
        </div>

        <div className="hud-top-right">
          <div>SUBJECT {subjectId}</div>
          <div>VISITS {visits}</div>
          <div className={armed ? "armed" : ""}>{armed ? "TOOLS ARMED" : "the tools stay quiet"}</div>
        </div>

        <div className="hud-bot-left">
          {events.slice(-7).map((l, i) => (
            <div key={`${i}-${l}`} className={i === events.slice(-7).length - 1 ? "tp tp-live" : "tp"}>
              {l}
            </div>
          ))}
        </div>

        <div className="hud-bot-right">
          <div>keys 1-4 · levers</div>
          <div>E · enter the screen</div>
          <div>click a lit ring segment · travel</div>
        </div>

        <div className="hud-bot-center">
          {FOCUS_BUTTONS.map(([id, label]) => (
            <button key={id} onClick={() => setFocus(id)} className="focus-btn">
              {label}
            </button>
          ))}
        </div>

        <button
          className="reset-link"
          onClick={() => {
            if (window.confirm("the room keeps no ashes. start a new subject?")) resetSubject();
          }}
        >
          the room keeps no ashes
        </button>
      </div>

      {/* ── the CRT OS (Phase 4 shell) ────────────────────────────── */}
      {inCrt && (
        <div className="crt-os">
          <div className="crt-bezel">
            <div className="os-title">THE OS :: {state.name}</div>
            <div className="os-sub">{state.moodLine}</div>
            <div className="os-programs">
              <button disabled>ARCHIVE://WORKS</button>
              <button disabled>RAMBLINGS.OF.A.MADMAN</button>
              <button disabled>TRANSMIT://COMMISSION</button>
              {PRESS_STORE_URL ? (
                <button onClick={() => window.open(PRESS_STORE_URL, "_blank")}>
                  SALVAGE://SHOPIFY
                </button>
              ) : (
                <button disabled>SALVAGE://SHOPIFY — setting the door</button>
              )}
              <button disabled>SIGNAL.NODE_MAP</button>
            </div>
            <div className="os-taskbar">
              {STATE_TABLE.map((s) => (
                <button
                  key={s.index}
                  className={s.index === state.index ? "signet-btn active" : "signet-btn"}
                  onClick={() => setState(s.index)}
                  title={`${s.bits.join("")} · ${s.name}`}
                >
                  {s.name.slice(0, 4)}
                </button>
              ))}
            </div>
            <div className="os-hint">programs open in phase 5. the signets below still re-tune the room.</div>
            <button className="deny" onClick={leaveCrt}>
              DENY ACCESS
            </button>
          </div>
        </div>
      )}
    </>
  );
}