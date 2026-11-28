import { useEffect, useState } from "react";
import { frameStats } from "./loop.ts";

/** "Frame time {ms} ms · {fps} fps" (rolling 1 s mean), refreshed about 4 times per second. */
export function FrameReadout() {
  const [text, setText] = useState("Frame time 0.0 ms · 0 fps");
  useEffect(() => {
    const id = setInterval(() => {
      const s = frameStats.snapshot(performance.now());
      setText(`Frame time ${s.meanWorkMs.toFixed(1)} ms · ${Math.round(s.fps)} fps`);
    }, 250);
    return () => clearInterval(id);
  }, []);
  return <p className="mt-2 font-mono text-sm tabular-nums">{text}</p>;
}
