import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/** Return question numbers in the order they appear in an assistant response. */
export function extractQuestionNumbers(text: string): string[] {
  // Allow common Markdown formatting around the label. Do not require a literal
  // ASCII `-`: responses may use bold labels, another separator, or no separator.
  const questionPattern =
    /^[^\S\r\n]*(?:[-*+]\s+)?❓(?:\uFE0F)?[^\S\r\n]*(?:[*_`~]+[^\S\r\n]*)?Q[^\S\r\n]*(\d+)\b/gimu;

  return [...text.matchAll(questionPattern)]
    .map((match) => match[1])
    .filter((number) => number !== undefined);
}

export default function answersExtension(pi: ExtensionAPI): void {
  pi.registerCommand("answers", {
    description:
      "Prefill recommended answers from the latest assistant response containing questions",
    handler: (_args, ctx) => {
      const branch = ctx.sessionManager.getBranch();
      let foundAssistant = false;
      let questionNumbers: string[] = [];

      for (let index = branch.length - 1; index >= 0; index -= 1) {
        const entry = branch[index];
        if (entry?.type !== "message" || entry.message.role !== "assistant") continue;

        foundAssistant = true;
        const text = entry.message.content
          .filter((content) => content.type === "text")
          .map((content) => content.text)
          .join("\n");
        questionNumbers = extractQuestionNumbers(text);
        // Tool-only messages and follow-ups (e.g. subagent updates) must not
        // hide questions from an earlier assistant response on this branch.
        if (questionNumbers.length > 0) break;
      }

      if (!foundAssistant) {
        ctx.ui.notify("No previous assistant response found.", "warning");
        return Promise.resolve();
      }

      if (questionNumbers.length === 0) {
        ctx.ui.notify(
          "No matching ❓ Q<number> questions found in assistant responses on this branch.",
          "warning",
        );
        return Promise.resolve();
      }

      ctx.ui.setEditorText(questionNumbers.map((number) => `Q${number}. 1`).join("\n"));
      return Promise.resolve();
    },
  });
}
