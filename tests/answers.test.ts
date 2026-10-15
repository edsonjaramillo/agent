import assert from "node:assert/strict";
import { test } from "node:test";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import answersExtension from "../extensions/answers.ts";

type Command = Parameters<ExtensionAPI["registerCommand"]>[1];
type Context = Parameters<Command["handler"]>[1];

const assistant = (...content: object[]) => ({
  type: "message",
  message: { role: "assistant", content },
});
const text = (value: string) => ({ type: "text", text: value });

async function run(branch: object[]) {
  let command: Command | undefined;
  let editor: string | undefined;
  const notifications: string[] = [];
  // Partial test double: the extension only uses registerCommand.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  answersExtension({
    registerCommand: (_name: string, registered: Command) => {
      command = registered;
    },
  } as unknown as ExtensionAPI);
  assert.ok(command);
  // Partial test double: the handler only uses getBranch and these UI methods.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  await command.handler("", {
    sessionManager: { getBranch: () => branch },
    ui: {
      setEditorText: (value: string) => {
        editor = value;
      },
      notify: (value: string) => {
        notifications.push(value);
      },
    },
  } as unknown as Context);
  return { editor, notifications };
}

await test("finds questions before tool calls and subagent follow-ups", async () => {
  const result = await run([
    assistant(text("❓ **Q2** - First?\n❓ Q5 - Second?")),
    assistant({ type: "toolCall", name: "Agent", id: "agent-1", arguments: {} }),
    {
      type: "message",
      message: { role: "toolResult", content: [text("❓ Q99 - Ignore tool output")] },
    },
    { type: "custom", data: {} },
    assistant(text("The subagent finished.")),
  ]);
  assert.equal(result.editor, "Q2. 1\nQ5. 1");
  assert.deepEqual(result.notifications, []);
});

await test("uses only the newest assistant response containing questions", async () => {
  const result = await run([
    assistant(text("❓ Q1 - Older?")),
    assistant(text("❓ Q3 - Newer?"), { type: "toolCall", name: "Agent" }),
  ]);
  assert.equal(result.editor, "Q3. 1");
});

await test("warns without changing the editor when no questions exist", async () => {
  const result = await run([assistant(text("No questions here."))]);
  assert.equal(result.editor, undefined);
  const notification = result.notifications[0];
  assert.ok(notification !== undefined);
  assert.match(notification, /No matching/u);
});

await test("warns when there is no assistant response", async () => {
  const result = await run([]);
  assert.equal(result.editor, undefined);
  assert.deepEqual(result.notifications, ["No previous assistant response found."]);
});
