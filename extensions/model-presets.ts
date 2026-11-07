import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * Slash commands that switch model + thinking level in one step.
 * Add a preset by adding a row; the command, description and behavior follow.
 */

type ThinkingLevel = Parameters<ExtensionAPI["setThinkingLevel"]>[0];

interface Preset {
  command: string;
  provider: string;
  model: string;
  label: string;
  thinking: ThinkingLevel;
}

const PRESETS = [
  {
    command: "smart",
    provider: "anthropic",
    model: "claude-opus-5-5",
    label: "Opus",
    thinking: "medium",
  },
  {
    command: "everyday",
    provider: "anthropic",
    model: "claude-sonnet-5-5",
    label: "Sonnet",
    thinking: "medium",
  },
  {
    command: "cheap",
    provider: "anthropic",
    model: "claude-haiku-5-5",
    label: "Haiku",
    thinking: "medium",
  },
] satisfies Preset[];

export default function modelPresetsExtension(pi: ExtensionAPI): void {
  for (const preset of PRESETS) {
    pi.registerCommand(preset.command, {
      description: `Use ${preset.label} with ${preset.thinking} thinking`,
      handler: async (_args, ctx) => {
        const id = `${preset.provider}/${preset.model}`;

        const model = ctx.modelRegistry.find(preset.provider, preset.model);
        if (!model) {
          ctx.ui.notify(`Model ${id} is not available.`, "error");
          return;
        }

        if (!(await pi.setModel(model))) {
          ctx.ui.notify(`Could not activate ${id}. Check your API credentials.`, "error");
          return;
        }

        pi.setThinkingLevel(preset.thinking);
        ctx.ui.notify(`/${preset.command}: ${preset.label}, ${preset.thinking} thinking`, "info");
      },
    });
  }
}
