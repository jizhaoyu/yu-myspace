import { type AppSettings, type SkillDefinitionView, type SkillMatchSnapshot, type SkillSettingsUpdateRequest } from "@/lib/types";
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
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 px-4 py-6 text-center text-xs text-slate-400">
        未发现可用的 Skills。
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((skill) => {
        const id = skill.id.toLowerCase();
        const isAuto = autoMatched.has(id);
        const isManual = manual.has(id);
        const isApplied = applied.has(id);
        const isDisabled = disabled.has(id);

        return (
          <article key={skill.id} className="rounded-2xl border border-white/8 bg-white/4 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="text-sm font-medium text-slate-100">{skill.name}</div>
                <div className="text-xs text-slate-400">{skill.description || skill.id}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isApplied ? <Badge tone="success">Applied</Badge> : null}
                {isAuto ? <Badge tone="info">Auto</Badge> : null}
                {isManual ? <Badge tone="accent">Manual</Badge> : null}
                {isDisabled ? <Badge tone="warning">Disabled</Badge> : <Badge tone="neutral">Enabled</Badge>}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                type="button"
                variant="ghost"
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
                variant="ghost"
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
                {isDisabled ? "启用" : "禁用"}
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
