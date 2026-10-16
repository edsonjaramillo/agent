import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";

const MODEL_PROVIDER = "anthropic";

const MODEL_PRESETS = {
  normal: {
    modelId: "claude-opus-5-5",
    thinkingLevel: "medium",
    description: "Use Opus with normal thinking",
  },
  smart: {
    modelId: "claude-opus-5-5",
    thinkingLevel: "high",
    description: "Use Opus with high thinking",
  },
  effecient: {
    modelId: "claude-sonnet-4-5",
    thinkingLevel: "high",
    description: "Use Sonnet with high thinking",
  },
} as const;

type ModelPresetName = keyof typeof MODEL_PRESETS;
type ModelPreset = (typeof MODEL_PRESETS)[ModelPresetName];

function isModelPresetName(name: string): name is ModelPresetName {
  return Object.hasOwn(MODEL_PRESETS, name);
}

const MODEL_PRESET_NAMES = Object.keys(MODEL_PRESETS).filter((name) => isModelPresetName(name));

async function applyModelPreset(
  pi: ExtensionAPI,
  preset: ModelPreset,
  ctx: ExtensionCommandContext,
): Promise<void> {
  const model = ctx.modelRegistry.find(MODEL_PROVIDER, preset.modelId);
  if (!model) {
    ctx.ui.notify(`Model ${MODEL_PROVIDER}/${preset.modelId} is not available.`, "error");
    return;
  }

  const modelSelected = await pi.setModel(model);
  if (!modelSelected) {
    ctx.ui.notify(
      `Could not activate ${MODEL_PROVIDER}/${preset.modelId}. Check your API credentials.`,
      "error",
    );
    return;
  }

  pi.setThinkingLevel(preset.thinkingLevel);
}

export default function modelPresetsExtension(pi: ExtensionAPI): void {
  pi.registerCommand("mode", {
    description: "Switch between model presets",
    getArgumentCompletions: (argumentPrefix) =>
      MODEL_PRESET_NAMES.filter((name) => name.startsWith(argumentPrefix)).map((name) => ({
        label: name,
        value: name,
      })),
    handler: async (args, ctx) => {
      const mode = args.trim().split(/\s+/u)[0] ?? "";

      if (!isModelPresetName(mode)) {
        ctx.ui.notify(`Choose a mode: ${MODEL_PRESET_NAMES.join(", ")}.`, "warning");
        return;
      }

      await applyModelPreset(pi, MODEL_PRESETS[mode], ctx);
    },
  });
}
