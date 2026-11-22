import fs from "node:fs/promises";
import { demand } from "./util.mjs";

export const designRules = JSON.parse(await fs.readFile(
  new URL("../../assets/design-rules.json", import.meta.url), "utf8",
));

export function designPrompt(mode, strength, brief = "") {
  demand(Object.hasOwn(designRules.modes, mode), "UNKNOWN_MODE", "Choose a design mode: " + Object.keys(designRules.modes).join(", "));
  demand(Number.isInteger(strength) && strength >= 0 && strength <= 8, "ARGUMENT", "Design strength must be an integer from 0 to 8.");
  const profile = designRules.modes[mode];
  const parts = [`Design preset: ${profile.name}. Design strength: ${strength}/8.`, designRules.levels[strength]];
  if (strength > 0) {
    parts.push(designRules.workflow, "Available tools: " + profile.tools, "Native composition: " + profile.plan);
    parts.push(strength < 6 ? "At this partial setting, apply the native recipe to the elements being rebuilt. Keep the other elements allowed by the selected level." : "Exclude: " + profile.exclude);
    parts.push("Inspect the rebuilt elements: " + profile.check);
  }
  parts.push(designRules.controls);
  if (brief.trim()) parts.push("Subject and required content:\n" + brief.trim());
  return parts.join("\n\n");
}

export function designCard() {
  const levels = designRules.levels.map((level, i) => `${i}/8 — ${level}`);
  const profiles = Object.entries(designRules.modes).map(([id, p]) =>
    `${p.name} (${id})\nTools: ${p.tools}\nComposition: ${p.plan}\nAt strict settings, exclude: ${p.exclude}\nCheck: ${p.check}`);
  return [
    "Retro-DTP design filter for ChatGPT Images",
    "Use this card when asked to generate or redesign an image. Name a preset and a design strength from 0 to 8. Default to Print Shop at 4/8 if unspecified. Run the ordinary image generator with the composed brief. This card requires no code execution.",
    'Example request: “Redesign the attached cover for Print Shop, design 6/8. Keep the band name, album title and seven state names. Turn the bridge into a stamp.”',
    designRules.workflow,
    designRules.controls,
    "Choose the strength\n\n" + levels.join("\n\n"),
    "Choose the tools\n\n" + profiles.join("\n\n"),
    "For levels 1–5, apply the native recipe to the parts being redesigned. At 6–8, apply the exclusions across the entire page. For a revision, reuse the original subject and locked copy, then generate a fresh composition at the new setting. Preserve the original aspect ratio unless the user requests another format.",
  ].join("\n\n") + "\n";
}
