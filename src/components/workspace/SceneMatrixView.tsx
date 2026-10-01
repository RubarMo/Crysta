import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Scene, Character } from '../../lib';
import { useLanguage } from '../../LanguageContext';
import { useModal } from '../../hooks/useModal';
import {
  X,
  Columns3,
  List,
  Plus,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface SceneMatrixViewProps {
  novelId: number;
  scenes: Scene[];
  characters: Character[];
  onSaveScene: (scene: Partial<Scene>) => Promise<void>;
  onDeleteScene: (id: number) => Promise<void>;
  onMoveScene: (index: number, direction: 'up' | 'down') => Promise<void>;
}

type ViewMode = 'list' | 'kanban';
type GroupBy = 'pov' | 'plot';

const inputClass =
  'w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)]';

export const SceneMatrixView: React.FC<SceneMatrixViewProps> = ({
  novelId,
  scenes,
  characters,
  onSaveScene,
  onDeleteScene,
  onMoveScene,
}) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [groupBy, setGroupBy] = useState<GroupBy>('pov');
  const [editingScene, setEditingScene] = useState<Partial<Scene> | null>(null);

  const getCharName = (povId: number | null | undefined) => {
    if (!povId) return t('unassignedPOV');
    return characters.find((char) => char.id === povId)?.name ?? t('unassignedPOV');
  };

  const plotThreads = Array.from(new Set(scenes.map((s) => s.plot_thread).filter(Boolean)));

  const handleMoveKanban = async (scene: Scene, value: string) => {
    if (groupBy === 'pov') {
      await onSaveScene({ ...scene, pov_character_id: value ? Number(value) : null });
    } else {
      await onSaveScene({ ...scene, plot_thread: value });
    }
  };

  const kanbanColumns = groupBy === 'pov'
    ? [
        { key: '', title: t('unassignedPOV'), color: 'var(--pastel-lavender)', matches: (s: Scene) => !s.pov_character_id },
        ...characters.map((c) => ({
          key: String(c.id),
          title: c.name,
          color: 'var(--pastel-sky)',
          matches: (s: Scene) => s.pov_character_id === c.id,
        })),
      ]
    : [
        { key: '', title: t('noThread'), color: 'var(--pastel-lavender)', matches: (s: Scene) => !s.plot_thread },
        ...plotThreads.map((thread) => ({
          key: thread,
          title: thread,
          color: 'var(--pastel-mint)',
          matches: (s: Scene) => s.plot_thread === thread,
        })),
      ];

  const tabClass = (active: boolean, activeBg: string) =>
    `flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer ${
      active
        ? `${activeBg} text-black shadow-[2px_2px_0px_var(--shadow-ink)] -translate-y-0.5`
        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] shadow-[1px_1px_0px_var(--shadow-ink)]'
    }`;

  return (
    <div className="space-y-4">
      {/* Top View Mode Switcher Toolbar */}
      <div className="p-3 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[2px_2px_0px_var(--shadow-ink)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5" role="group">
          <button type="button" aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')} className={tabClass(viewMode === 'list', 'bg-[var(--pastel-yellow)]')}>
            <List className="w-3.5 h-3.5" />
            <span>{t('viewList')}</span>
          </button>
          <button type="button" aria-pressed={viewMode === 'kanban'} onClick={() => setViewMode('kanban')} className={tabClass(viewMode === 'kanban', 'bg-[var(--pastel-sky)]')}>
            <Columns3 className="w-3.5 h-3.5" />
            <span>{t('viewKanban')}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'kanban' && (
            <div className="flex items-center gap-1" role="group">
              {(['pov', 'plot'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={groupBy === mode}
                  onClick={() => setGroupBy(mode)}
                  className={`px-2 py-1 text-[10px] font-heading font-bold border-2 border-[var(--border-ink)] cursor-pointer ${
                    groupBy === mode ? 'bg-black text-white' : 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                  }`}
                >
                  {mode === 'pov' ? t('groupByPOV') : t('groupByPlot')}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setEditingScene({ novel_id: novelId, setting: '', what_happens: '', plot_thread: '', pov_character_id: null, expected_word_count: 1000, actual_word_count: 0 })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-yellow)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>{t('addSceneBtn')}</span>
          </button>
        </div>
      </div>

      {/* 1. LIST VIEW */}
      {viewMode === 'list' && (
        scenes.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-[var(--border-subtle)] text-center text-[var(--text-muted)] text-xs">
            {t('noScenesYet')} {t('noScenesDesc')}
          </div>
        ) : (
          <div className="space-y-2">
            {scenes.map((scene, idx) => (
              <div
                key={scene.id ?? idx}
                className="p-3 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[2px_2px_0px_var(--shadow-ink)] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="flex items-center gap-1 shrink-0 pt-0.5 sm:pt-0">
                    <span className="w-7 h-7 font-mono text-[11px] font-black bg-[var(--pastel-sky)] text-black border border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)] flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => onMoveScene(idx, 'up')}
                        className="p-0.5 border border-[var(--border-ink)] bg-[var(--bg-surface)] hover:bg-black hover:text-white transition-colors disabled:opacity-20 cursor-pointer"
                        title={t('moveUp')}
                        aria-label={t('moveUp')}
                      >
                        <ArrowUp className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === scenes.length - 1}
                        onClick={() => onMoveScene(idx, 'down')}
                        className="p-0.5 border border-[var(--border-ink)] bg-[var(--bg-surface)] hover:bg-black hover:text-white transition-colors disabled:opacity-20 cursor-pointer"
                        title={t('moveDown')}
                        aria-label={t('moveDown')}
                      >
                        <ArrowDown className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="text-xs font-heading font-black text-[var(--text-primary)]">
                        {scene.setting || t('uncategorized')}
                      </h4>
                      {scene.pov_character_id && (
                        <span className="px-1.5 py-0.5 font-heading font-bold text-[10px] bg-[var(--pastel-lavender)] text-black border border-[var(--border-ink)] shrink-0">
                          {t('scenePovLabel')}: {getCharName(scene.pov_character_id)}
                        </span>
                      )}
                      {scene.plot_thread && (
                        <span className="px-1.5 py-0.5 font-mono text-[10px] bg-[var(--pastel-mint)] text-black border border-[var(--border-ink)] shrink-0">
                          {scene.plot_thread}
                        </span>
                      )}
                    </div>
                    {scene.what_happens && (
                      <p className="text-[11px] text-[var(--text-secondary)] font-sans line-clamp-2 leading-relaxed">
                        {scene.what_happens}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-dashed border-[var(--border-subtle)]">
                  <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-1 border border-[var(--border-ink)]">
                    {scene.expected_word_count} {t('words')}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingScene(scene)}
                      className="p-1.5 text-[10px] font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] hover:bg-[var(--pastel-sky)] hover:text-black shadow-[1px_1px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1"
                      title={t('edit')}
                      aria-label={t('edit')}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">{t('edit')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => scene.id && onDeleteScene(scene.id)}
                      className="p-1.5 text-[10px] font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[1px_1px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1"
                      title={t('delete')}
                      aria-label={t('delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">{t('delete')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* 2. KANBAN BOARD VIEW */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 items-start">
          {kanbanColumns.map((col) => {
            const colScenes = scenes.filter(col.matches);

            return (
              <div
                key={`${groupBy}-${col.key}`}
                className="w-72 md:w-80 border-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[3px_3px_0px_var(--shadow-ink)] flex flex-col max-h-[70vh] shrink-0"
              >
                <div className="p-3 border-b-2 border-[var(--border-ink)] flex items-center justify-between text-black" style={{ backgroundColor: col.color }}>
                  <h4 className="text-xs font-heading font-black truncate">{col.title}</h4>
                  <span className="font-mono text-[10px] font-black px-1.5 py-0.5 bg-black text-white">
                    {colScenes.length}
                  </span>
                </div>

                <div className="p-2 space-y-2 overflow-y-auto flex-1">
                  {colScenes.map((scene) => (
                    <div
                      key={scene.id}
                      className="p-2.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] shadow-[2px_2px_0px_var(--shadow-ink)] space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="text-xs font-heading font-black text-[var(--text-primary)] truncate">
                          {scene.setting || t('uncategorized')}
                        </h5>
                        <button
                          type="button"
                          onClick={() => setEditingScene(scene)}
                          className="p-1 hover:bg-[var(--pastel-yellow)] hover:text-black transition-colors cursor-pointer"
                          title={t('edit')}
                          aria-label={t('edit')}
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] font-sans line-clamp-2">
                        {scene.what_happens}
                      </p>

                      <div className="pt-1 flex items-center justify-between gap-2 text-[10px] font-mono text-[var(--text-muted)]">
                        <span>{scene.expected_word_count} {t('words')}</span>
                        <select
                          value={groupBy === 'pov' ? String(scene.pov_character_id ?? '') : scene.plot_thread || ''}
                          onChange={(e) => handleMoveKanban(scene, e.target.value)}
                          aria-label={groupBy === 'pov' ? t('scenePovLabel') : t('scenePlotLabel')}
                          className="text-[9px] font-heading font-bold border border-[var(--border-ink)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] cursor-pointer max-w-[60%]"
                        >
                          <option value="">{groupBy === 'pov' ? t('unassignedPOV') : t('noThread')}</option>
                          {groupBy === 'pov'
                            ? characters.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))
                            : plotThreads.map((thread) => (
                                <option key={thread} value={thread}>{thread}</option>
                              ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingScene && (
        <SceneEditModal
          scene={editingScene}
          characters={characters}
          onChange={setEditingScene}
          onClose={() => setEditingScene(null)}
          onSave={async () => {
            await onSaveScene(editingScene);
            setEditingScene(null);
          }}
        />
      )}
    </div>
  );
};

interface SceneEditModalProps {
  scene: Partial<Scene>;
  characters: Character[];
  onChange: (scene: Partial<Scene>) => void;
  onSave: () => void;
  onClose: () => void;
}

const SceneEditModal: React.FC<SceneEditModalProps> = ({ scene, characters, onChange, onSave, onClose }) => {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDivElement>(null);
  useModal(dialogRef, onClose);

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scene-dialog-title"
        tabIndex={-1}
        className="bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] shadow-[6px_6px_0px_var(--shadow-ink)] w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto select-text"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-[var(--border-ink)] pb-2">
          <h3 id="scene-dialog-title" className="text-sm font-heading font-black text-[var(--text-primary)]">
            {scene.id ? t('edit') : t('addSceneBtn')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[1.5px_1.5px_0px_var(--shadow-ink)] transition-all cursor-pointer"
            title={t('close')}
            aria-label={t('closeDialog')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <div>
            <label htmlFor="scene-setting" className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
              {t('sceneSettingLabel')}
            </label>
            <input
              id="scene-setting"
              type="text"
              value={scene.setting || ''}
              onChange={(e) => onChange({ ...scene, setting: e.target.value })}
              placeholder={t('sceneSettingPlaceholder')}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="scene-pov" className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
                {t('scenePovLabel')}
              </label>
              <select
                id="scene-pov"
                value={scene.pov_character_id ?? ''}
                onChange={(e) => onChange({ ...scene, pov_character_id: e.target.value ? Number(e.target.value) : null })}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="">{t('unassignedPOV')}</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="scene-plot" className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
                {t('scenePlotLabel')}
              </label>
              <input
                id="scene-plot"
                type="text"
                value={scene.plot_thread || ''}
                onChange={(e) => onChange({ ...scene, plot_thread: e.target.value })}
                placeholder={t('scenePlotPlaceholder')}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="scene-what" className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
              {t('sceneWhatHappensLabel')}
            </label>
            <textarea
              id="scene-what"
              value={scene.what_happens || ''}
              onChange={(e) => onChange({ ...scene, what_happens: e.target.value })}
              placeholder={t('sceneWhatHappensPlaceholder')}
              rows={4}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label htmlFor="scene-words" className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
              {t('sceneExpectedWordsLabel')}
            </label>
            <input
              id="scene-words"
              type="number"
              min={0}
              value={scene.expected_word_count ?? 0}
              onChange={(e) => onChange({ ...scene, expected_word_count: Math.max(0, parseInt(e.target.value, 10) || 0) })}
              className={`${inputClass} font-mono`}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-[var(--border-ink)]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-heading font-bold border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-yellow)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
