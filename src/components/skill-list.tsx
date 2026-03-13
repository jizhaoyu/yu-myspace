import {
  type AppSettings,
  type SkillDefinitionView,
  type SkillMatchSnapshot,
  type SkillSettingsUpdateRequest,
} from "@/lib/types";
import { Badge, Button } from "@/components/ui";

type SkillListProps = {
  skills: SkillDefinitionView[];
  settings: AppSettings;
  match: SkillMatchSnapshot | null;
  pending: boolean;
  onUpdate: (payload: SkillSettingsUpdateRequest) => void;
};

function normalizeIds(ids: string[]) {
  return ids.map((id) => id.toLowerCase());
}

export function SkillList({ skills, settings, match, pending, onUpdate }: SkillListProps) {
  const autoMatched = new Set(normalizeIds(match?.autoMatchedSkillIds ?? []));
  const applied = new Set(normalizeIds(match?.appliedSkillIds ?? []));
  const manual = new Set(normalizeIds(settings.manualSkillIds));
  const disabled = new Set(normalizeIds(settings.disabledSkillIds));

  const sorted = [...skills].sort((left, right) => left.name.localeCompare(right.name));

  if (!sorted.length) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 px-4 py-6 text-center text-sm text-zinc-400">
        暂未发现可用技能。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((skill) => {
        const id = skill.id.toLowerCase();
        const isAuto = autoMatched.has(id);
        const isManual = manual.has(id);
        const isApplied = applied.has(id);
        const isDisabled = disabled.has(id);

        return (
          <article
            key={skill.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-950/72 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/90"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div>
                  <div className="text-sm font-semibold text-zinc-100">{skill.name}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                    {skill.id}
                  </div>
                </div>
                <div className="max-w-2xl text-sm leading-6 text-zinc-400">
                  {skill.description || "暂无描述。"}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isApplied ? <Badge tone="success">已应用</Badge> : null}
                {isAuto ? <Badge tone="info">自动</Badge> : null}
                {isManual ? <Badge tone="accent">手动</Badge> : null}
                {isDisabled ? <Badge tone="warning">已禁用</Badge> : <Badge tone="neutral">已启用</Badge>}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                type="button"
                variant={isManual ? "secondary" : "ghost"}
                loading={pending}
                onClick={() => {
                  const next = isManual
                    ? settings.manualSkillIds.filter((item) => item.toLowerCase() !== id)
                    : [...settings.manualSkillIds, skill.id];
                  onUpdate({ manualSkillIds: next });
                }}
              >
                {isManual ? "移除手动" : "手动添加"}
              </Button>

              <Button
                size="sm"
                type="button"
                variant={isDisabled ? "secondary" : "ghost"}
                loading={pending}
                onClick={() => {
                  const nextDisabled = isDisabled
                    ? settings.disabledSkillIds.filter((item) => item.toLowerCase() !== id)
                    : [...settings.disabledSkillIds, skill.id];
                  const nextManual = isDisabled
                    ? settings.manualSkillIds
                    : settings.manualSkillIds.filter((item) => item.toLowerCase() !== id);
                  onUpdate({ disabledSkillIds: nextDisabled, manualSkillIds: nextManual });
                }}
              >
                {isDisabled ? "启用技能" : "禁用技能"}
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
