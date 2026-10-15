import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const skillGroups = {
  setup: ["aihero/triage", "aihero/setup-matt-pocock-skills"],
  grilling: [
    "aihero/domain-modeling",
    "aihero/grill-with-docs",
    "aihero/grilling",
    "aihero/to-spec",
    "aihero/to-tickets",
  ],
  implement: ["aihero/code-review", "aihero/implement", "aihero/tdd"],
};

type SkillGroup = keyof typeof skillGroups;
function isSkillGroup(name: string): name is SkillGroup {
  return Object.hasOwn(skillGroups, name);
}

const groupNames = Object.keys(skillGroups).filter((name) => isSkillGroup(name));
const managedName = (skill: string) => skill.slice(skill.lastIndexOf("/") + 1);

export default function aiHeroExtension(pi: ExtensionAPI): void {
  pi.registerCommand("aihero", {
    description: "Link AI-Hero skills",
    getArgumentCompletions: () => groupNames.map((name) => ({ label: name, value: name })),
    handler: async (args, ctx) => {
      const group = args.trim().split(/\s+/u)[0] ?? "";

      if (!isSkillGroup(group)) {
        ctx.ui.notify(`Choose a skill group: ${groupNames.join(", ")}.`, "warning");
        return;
      }

      const listResult = await pi.exec("bond", ["skills", "list"]);
      if (listResult.code !== 0) {
        ctx.ui.notify(listResult.stderr, "error");
        return;
      }

      const installedSkills = new Set(
        listResult.stdout
          .split(/\r?\n/u)
          .map((name) => name.trim())
          .filter(Boolean),
      );
      const skillsToAdd = skillGroups[group].filter(
        (skill) => !installedSkills.has(managedName(skill)),
      );
      const skillsToRemove = groupNames
        .filter((name) => name !== group)
        .flatMap((name) => skillGroups[name])
        .map((skill) => managedName(skill))
        .filter((skill) => installedSkills.has(skill));

      if (skillsToRemove.length > 0) {
        const removeResult = await pi.exec("bond", ["skills", "remove", ...skillsToRemove]);
        if (removeResult.code !== 0) {
          ctx.ui.notify(removeResult.stderr, "error");
          return;
        }
      }

      if (skillsToAdd.length > 0) {
        const addResult = await pi.exec("bond", ["skills", "add", ...skillsToAdd]);
        if (addResult.code !== 0) {
          ctx.ui.notify(addResult.stderr, "error");
          return;
        }
      }

      ctx.ui.notify(`${group} skill group activated.`, "info");
      await ctx.reload();
    },
  });
}
