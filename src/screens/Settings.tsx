import { useEffect, useState } from 'react';
import { BackHeader, Button, Card, Field, SectionTitle, Segmented, Sheet, Stepper, cx, inputCls } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useProfile, useSchedule } from '@/db/hooks';
import { exportBackup, exportCsv, importBackup, resetAll, saveProfile, saveSchedule } from '@/db/repo';
import type { Profile, Schedule, Sex } from '@/db/types';
import { planDay } from '@/domain/planner';
import { WEEKDAYS_SHORT, WEEK_ORDER, formatDateBR, isoDate } from '@/domain/time';
import { useUi } from '@/store';

/** No iPhone abre a folha de compartilhamento (Salvar em Arquivos); no resto, baixa o arquivo. */
async function download(name: string, content: Blob) {
  const file = new File([content], name, { type: content.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(content);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function Settings() {
  const profile = useProfile();
  const schedule = useSchedule();
  const toast = useUi((s) => s.showToast);
  const [s, setS] = useState<Schedule | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  useEffect(() => {
    if (schedule) setS(schedule);
  }, [schedule]);
  if (!profile || !schedule || !s) return null;

  const dirty = JSON.stringify(s) !== JSON.stringify(schedule);
  const preview = planDay(s);
  const up = (patch: Partial<Schedule>) => setS({ ...s, ...patch });
  const upP = (patch: Partial<Profile>) => saveProfile(patch);

  return (
    <>
      <BackHeader title="Ajustes" back="/" />

      <SectionTitle>Agenda</SectionTitle>
      <Card className="space-y-3">
        <Row label="Saio de casa às"><input type="time" className={cx(inputCls, 'w-32 text-center')} value={s.departure} onChange={(e) => up({ departure: e.target.value })} /></Row>
        <Row label="Deslocamento"><Stepper label="Deslocamento" value={s.commuteMin} step={5} onChange={(v) => up({ commuteMin: v })} suffix="min" /></Row>
        <Row label="Hora limite na academia"><input type="time" className={cx(inputCls, 'w-32 text-center')} value={s.gymDeadline} onChange={(e) => up({ gymDeadline: e.target.value })} /></Row>
        <Row label="Horas de sono"><Stepper label="Horas de sono" value={s.sleepHours} step={0.5} onChange={(v) => up({ sleepHours: v })} suffix="h" /></Row>
        <Row label="Acordar → sair"><Stepper label="Tempo entre acordar e sair" value={s.prepMin} step={5} onChange={(v) => up({ prepMin: Math.max(20, v) })} suffix="min" /></Row>
        <Row label="Pós-treino após"><Stepper label="Minutos até o pós-treino" value={s.postDelayMin} step={5} onChange={(v) => up({ postDelayMin: v })} suffix="min" /></Row>
        <Field label="Refeições por dia">
          <Segmented<'5' | '6'> label="Refeições por dia" value={String(s.mealsPerDay) as '5' | '6'} onChange={(v) => up({ mealsPerDay: Number(v) as 5 | 6 })} options={[{ value: '5', label: '5 (sem ceia)' }, { value: '6', label: '6 (com ceia)' }]} />
        </Field>
        <Field label="Dias de treino">
          <div className="flex gap-1">
            {WEEK_ORDER.map((d) => {
              const on = s.trainingDays.includes(d);
              return (
                <button key={d} type="button" aria-pressed={on} onClick={() => up({ trainingDays: on ? s.trainingDays.filter((x) => x !== d) : [...s.trainingDays, d].sort() })} className={cx('press min-h-11 flex-1 rounded-2xl text-[13px] font-semibold', on ? 'bg-accent text-accent-ink' : 'glass text-ink-2')}>
                  {WEEKDAYS_SHORT[d]}
                </button>
              );
            })}
          </div>
        </Field>
        <p className="tabular text-[13px] text-ink-3">
          Dormir {preview.bedtime} · acordar {preview.wake} · pré-treino {preview.preWorkout.from} · treino {preview.gymArrival}–{preview.gymDeadline} ({preview.windowMin} min) · pós {preview.postWorkout}
        </p>
        {preview.warnings.map((w) => <p key={w} className="text-[13px] text-warn">{w}</p>)}
        {dirty && (
          <div className="flex gap-2">
            <Button onClick={() => setS(schedule)}>Desfazer</Button>
            <Button variant="primary" className="flex-1" disabled={!s.trainingDays.length} onClick={() => setConfirmOpen(true)}>Salvar agenda</Button>
          </div>
        )}
      </Card>

      <SectionTitle>Perfil</SectionTitle>
      <Card className="space-y-3">
        <Field label="Nome"><input className={inputCls} defaultValue={profile.name} onBlur={(e) => upP({ name: e.target.value })} /></Field>
        <Field label="Sexo"><Segmented<Sex> label="Sexo" value={profile.sex} onChange={(v) => upP({ sex: v })} options={[{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Feminino' }]} /></Field>
        <Row label="Idade"><Stepper label="Idade" value={profile.age} onChange={(v) => upP({ age: Math.round(v) })} suffix="anos" /></Row>
        <Row label="Altura"><Stepper label="Altura" value={profile.heightCm} onChange={(v) => upP({ heightCm: v })} suffix="cm" /></Row>
        <p className="text-[13px] text-ink-3">Peso, objetivo e macros ficam em Dieta → Metas. Início do programa: {formatDateBR(profile.programStart, { day: '2-digit', month: 'short', year: 'numeric' })}.</p>
      </Card>

      <SectionTitle>Aparência</SectionTitle>
      <Card className="space-y-3">
        <Segmented<Profile['theme']> label="Tema" value={profile.theme} onChange={(v) => upP({ theme: v })} options={[{ value: 'auto', label: 'Automático' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Escuro' }]} />
        <label className="flex min-h-11 items-center justify-between gap-3">
          <span>
            <span className="block font-medium">Reduzir transparência</span>
            <span className="text-[12px] text-ink-3">Superfícies sólidas no lugar do vidro (mais contraste)</span>
          </span>
          <input type="checkbox" className="h-6 w-6 accent-[color:var(--accent)]" checked={!profile.blur} onChange={(e) => upP({ blur: !e.target.checked })} />
        </label>
      </Card>

      <Backup lastBackupAt={profile.lastBackupAt} onToast={toast} />
      <UpdateCard />

      <SectionTitle>Sobre</SectionTitle>
      <Card className="space-y-2 text-[13px] text-ink-3">
        <p>Forja é apoio organizacional e não substitui nutricionista, médico ou educador físico.</p>
        <p>Sem notificações e sem envio de dados: tudo fica no aparelho. Imagens dos exercícios: free-exercise-db (domínio público).</p>
        <Button
          variant="danger"
          size="sm"
          onClick={async () => {
            if (confirm('Apagar TODOS os dados do app? Faça um backup antes.') && confirm('Tem certeza? Não dá para desfazer.')) {
              await resetAll();
              location.reload();
            }
          }}
        >
          Apagar todos os dados
        </Button>
      </Card>

      <Sheet open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Atualizar horários?">
        <p className="text-[15px] text-ink-2">A agenda nova muda o horário de todas as refeições da semana (os alimentos continuam iguais).</p>
        <div className="my-4 space-y-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={async () => {
              await saveSchedule(s, true);
              setConfirmOpen(false);
              toast('Agenda e refeições recalculadas', 'check');
            }}
          >
            Recalcular refeições
          </Button>
          <Button
            size="lg"
            className="w-full"
            onClick={async () => {
              await saveSchedule(s, false);
              setConfirmOpen(false);
              toast('Agenda salva; refeições mantidas', 'check');
            }}
          >
            Manter horários das refeições
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-medium">{label}</span>
      {children}
    </div>
  );
}

function Backup({ lastBackupAt, onToast }: { lastBackupAt?: string; onToast: (t: string, i?: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <SectionTitle>Backup</SectionTitle>
      <Card className="space-y-3">
        <p className="text-[14px] text-ink-2">
          Os dados ficam só neste iPhone e o Safari pode apagá-los se o app ficar muito tempo sem uso. Exporte um backup pelo menos 1× por mês e guarde no app Arquivos/iCloud.
        </p>
        <p className="text-[13px] text-ink-3">Último backup: {lastBackupAt ? formatDateBR(lastBackupAt.slice(0, 10), { day: '2-digit', month: 'short', year: 'numeric' }) : 'nunca'}</p>
        <Button
          variant="primary"
          className="w-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const data = await exportBackup(true);
            await download(`forja-backup-${isoDate()}.json`, new Blob([JSON.stringify(data)], { type: 'application/json' }));
            setBusy(false);
            onToast('Backup exportado', 'download');
          }}
        >
          <Icon name="download" size={18} /> Exportar backup completo (JSON)
        </Button>
        <Button
          className="w-full"
          onClick={async () => {
            const csv = await exportCsv();
            await download(`forja-medidas-${isoDate()}.csv`, new Blob(['﻿' + csv.medidas], { type: 'text/csv' }));
            await download(`forja-series-${isoDate()}.csv`, new Blob(['﻿' + csv.series], { type: 'text/csv' }));
          }}
        >
          Exportar planilhas (CSV)
        </Button>
        <label className="glass press flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full text-[15px] font-semibold">
          <Icon name="upload" size={18} /> Importar backup
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f || !confirm('Importar este backup? Os dados atuais serão substituídos.')) return;
              try {
                await importBackup(JSON.parse(await f.text()));
                onToast('Backup importado', 'check');
              } catch (err) {
                alert(err instanceof Error ? err.message : 'Não foi possível importar.');
              }
            }}
          />
        </label>
      </Card>
    </>
  );
}

function UpdateCard() {
  return (
    <>
      <SectionTitle>App</SectionTitle>
      <Card className="space-y-1 text-[14px]">
        <p>Funciona offline depois do primeiro carregamento.</p>
        <p className="text-[13px] text-ink-3">Versão {__APP_VERSION__}. Quando houver versão nova, um aviso aparece no topo ao abrir o app com internet.</p>
      </Card>
    </>
  );
}
