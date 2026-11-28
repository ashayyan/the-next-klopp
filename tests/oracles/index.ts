// Oracle map: interaction registry id to the code that completes it. Empty until the interactions
// land (05-11 and 05-12 add entries). The walker fails a lesson step whose interaction has no entry.
import type { Oracle } from "../walker/drivers.ts";

export const ORACLES: Record<string, Oracle<unknown>> = {};
