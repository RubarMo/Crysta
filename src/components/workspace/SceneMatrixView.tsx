import React, { useState } from 'react';
import { Scene, Character, reorderScenes } from '../../lib';
import { useLanguage } from '../../LanguageContext';
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
  onReload: () => void;
}

type ViewMode = 'list' | 'kanban';
type GroupBy = 'pov' | 'plot';

export const SceneMatrixView: React.FC<SceneMatrixViewProps> = ({
  novelId,
  scenes,
  characters,
  onSaveScene,
  onDeleteScene,
  onReload,
}) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [groupBy, setGroupBy] = useState<GroupBy>('pov');
  
  // Active editing scene modal/pane
  const [editingScene, setEditingScene] = useState<Partial<Scene> | null>(null);

  const getCharName = (povId: number | null | undefined) => {
    if (!povId) return t('unassignedPOV');
    const c = characters.find((char) => char.id === povId);
    return c ? c.name : t('unassignedPOV');
  };

  // Reorder up/down helper
  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= scenes.length) return;

    const newList = [...scenes];
    const [moved] = newList.splice(index, 1);
    newList.splice(target, 0, moved);

    const ids = newList.map((s) => s.id!).filter(Boolean);
    try {
      await reorderScenes(novelId, ids);
      onReload();
    } catch (err) {
      console.error('Failed to reorder scenes:', err);
    }
  };

  // Move scene to different POV / Thread in Kanban
  const handleMoveKanban = async (scene: Scene, newGroupId: number | null | string) => {
    if (groupBy === 'pov') {
      await onSaveScene({
        ...scene,
        pov_character_id: newGroupId === null ? null : (newGroupId as number),
      });
    } else {
      await onSaveScene({
        ...scene,
        plot_thread: newGroupId === null ? '' : (newGroupId as string),
      });
    }
    onReload();
  };

  // Columns for Kanban
  const kanbanColumns = groupBy === 'pov'
    ? [
        { id: null as number | null, title: t('unassignedPOV'), color: 'var(--pastel-lavender)' },
        ...characters.map((c) => ({ id: c.id as number | null, title: c.name, color: 'var(--pastel-sky)' })),
      ]
    : [
        { id: '' as string | null, title: t('noThread'), color: 'var(--pastel-lavender)' },
        ...Array.from(new Set(scenes.map((s) => s.plot_thread).filter(Boolean))).map((thread) => ({
          id: thread,
          title: thread,
          color: 'var(--pastel-mint)',
        })),
      ];

  return (
    <div className="space-y-4">
      {/* Top View Mode Switcher Toolbar */}
      <div className="p-3 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[2px_2px_0px_var(--shadow-ink)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-[var(--pastel-yellow)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] -translate-y-0.5'
                : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] shadow-[1px_1px_0px_var(--shadow-ink)]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>{t('viewList')}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer ${
              viewMode === 'kanban'
                ? 'bg-[var(--pastel-sky)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] -translate-y-0.5'
                : 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] shadow-[1px_1px_0px_var(--shadow-ink)]'
            }`}
          >
            <Columns3 className="w-3.5 h-3.5" />
            <span>{t('viewKanban')}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'kanban' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setGroupBy('pov')}
                className={`px-2 py-1 text-[10px] font-heading font-bold border-2 border-[var(--border-ink)] cursor-pointer ${
                  groupBy === 'pov' ? 'bg-black text-white' : 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                }`}
              >
                {t('groupByPOV')}
              </button>
              <button
                type="button"
                onClick={() => setGroupBy('plot')}
                className={`px-2 py-1 text-[10px] font-heading font-bold border-2 border-[var(--border-ink)] cursor-pointer ${
                  groupBy === 'plot' ? 'bg-black text-white' : 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                }`}
              >
                {t('groupByPlot')}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setEditingScene({ novel_id: novelId, setting: '', what_happens: '', plot_thread: '', expected_word_count: 1000, actual_word_count: 0 })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-yellow)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>{t('addSceneBtn')}</span>
          </button>
        </div>
      </div>

      {/* 1. LIST VIEW (Linear stacked rows) */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {scenes.map((scene, idx) => (
            <div
              key={scene.id || idx}
              className="p-3 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:border-black transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              {/* Left Column: Number, Reorder, Setting, Tags, Summary */}
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {/* Index and Reorder Controls */}
                <div className="flex items-center gap-1 shrink-0 pt-0.5 sm:pt-0">
                  <span className="w-7 h-7 font-mono text-[11px] font-black bg-[var(--pastel-sky)] text-black border border-[var(--border-ink)] shadow-[1px_1px_0px_var(--shadow-ink)] flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleReorder(idx, 'up')}
                      className="p-0.5 border border-[var(--border-ink)] bg-[var(--bg-surface)] hover:bg-black hover:text-white transition-colors disabled:opacity-20 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-2.5 h-2.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === scenes.length - 1}
                      onClick={() => handleReorder(idx, 'down')}
                      className="p-0.5 border border-[var(--border-ink)] bg-[var(--bg-surface)] hover:bg-black hover:text-white transition-colors disabled:opacity-20 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

                {/* Content details */}
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

              {/* Right Column: Words & Actions */}
              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-dashed border-[var(--border-subtle)]">
                <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-1 border border-[var(--border-ink)]">
                  {scene.expected_word_count} {t('targetWords')}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditingScene(scene)}
                    className="p-1.5 text-[10px] font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] hover:bg-[var(--pastel-sky)] hover:text-black shadow-[1px_1px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1"
                    title={t('edit')}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">{t('edit')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => scene.id && onDeleteScene(scene.id)}
                    className="p-1.5 text-[10px] font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[1px_1px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1"
                    title={t('delete')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">{t('delete')}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. KANBAN BOARD VIEW */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 items-start">
          {kanbanColumns.map((col, colIdx) => {
            const colScenes = scenes.filter((s) => {
              if (groupBy === 'pov') {
                return col.id === null ? !s.pov_character_id : s.pov_character_id === col.id;
              } else {
                return col.id === '' ? !s.plot_thread : s.plot_thread === col.id;
              }
            });

            return (
              <div
                key={colIdx}
                className="w-72 md:w-80 border-3 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] shadow-[3px_3px_0px_var(--shadow-ink)] flex flex-col max-h-[70vh] shrink-0"
              >
                {/* Column Header */}
                <div
                  className="p-3 border-b-2 border-[var(--border-ink)] flex items-center justify-between"
                  style={{ backgroundColor: col.color, color: '#000' }}
                >
                  <h4 className="text-xs font-heading font-black truncate">{col.title}</h4>
                  <span className="font-mono text-[10px] font-black px-1.5 py-0.5 bg-black text-white">
                    {colScenes.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="p-2 space-y-2 overflow-y-auto flex-1">
                  {colScenes.map((scene) => (
                    <div
                      key={scene.id}
                      className="p-2.5 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] shadow-[2px_2px_0px_var(--shadow-ink)] space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-heading font-black text-[var(--text-primary)] truncate">
                          {scene.setting || t('uncategorized')}
                        </h5>
                        <button
                          type="button"
                          onClick={() => setEditingScene(scene)}
                          className="p-1 hover:bg-[var(--pastel-yellow)] hover:text-black transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] font-sans line-clamp-2">
                        {scene.what_happens}
                      </p>

                      {/* Move to another column select */}
                      <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                        <span>{scene.expected_word_count} words</span>
                        <select
                          value={groupBy === 'pov' ? (scene.pov_character_id || '') : (scene.plot_thread || '')}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleMoveKanban(scene, groupBy === 'pov' ? (val ? Number(val) : null) : val);
                          }}
                          className="text-[9px] font-heading font-bold border border-[var(--border-ink)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] cursor-pointer"
                        >
                          <option value="">{groupBy === 'pov' ? t('unassignedPOV') : t('noThread')}</option>
                          {groupBy === 'pov'
                            ? characters.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))
                            : Array.from(new Set(scenes.map((s) => s.plot_thread).filter(Boolean))).map((thread) => (
                                <option key={thread} value={thread}>
                                  {thread}
                                </option>
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


      {/* EDIT SCENE MODAL */}
      {editingScene && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setEditingScene(null)}
        >
          <div 
            className="bg-[var(--bg-surface)] border-3 border-[var(--border-ink)] shadow-[6px_6px_0px_var(--shadow-ink)] w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-[var(--border-ink)] pb-2">
              <h3 className="text-sm font-heading font-black text-[var(--text-primary)]">
                {editingScene.id ? t('edit') : t('addSceneBtn')}
              </h3>
              <button
                type="button"
                onClick={() => setEditingScene(null)}
                className="p-1 border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--pastel-coral)] hover:text-black shadow-[1.5px_1.5px_0px_var(--shadow-ink)] transition-all cursor-pointer"
                title={t('close')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
                  {t('sceneSettingLabel')}
                </label>
                <input
                  type="text"
                  value={editingScene.setting || ''}
                  onChange={(e) => setEditingScene({ ...editingScene, setting: e.target.value })}
                  placeholder={t('sceneSettingPlaceholder')}
                  className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
                    {t('scenePovLabel')}
                  </label>
                  <select
                    value={editingScene.pov_character_id || ''}
                    onChange={(e) => setEditingScene({ ...editingScene, pov_character_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] cursor-pointer"
                  >
                    <option value="">{t('unassignedPOV')}</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
                    {t('scenePlotLabel')}
                  </label>
                  <input
                    type="text"
                    value={editingScene.plot_thread || ''}
                    onChange={(e) => setEditingScene({ ...editingScene, plot_thread: e.target.value })}
                    placeholder={t('scenePlotPlaceholder')}
                    className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
                  {t('sceneWhatHappensLabel')}
                </label>
                <textarea
                  value={editingScene.what_happens || ''}
                  onChange={(e) => setEditingScene({ ...editingScene, what_happens: e.target.value })}
                  placeholder={t('sceneWhatHappensPlaceholder')}
                  rows={4}
                  className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-heading font-bold text-[var(--text-primary)] block mb-1">
                  {t('sceneExpectedWordsLabel')}
                </label>
                <input
                  type="number"
                  value={editingScene.expected_word_count || 1000}
                  onChange={(e) => setEditingScene({ ...editingScene, expected_word_count: Number(e.target.value) })}
                  className="w-full text-xs p-2 border-2 border-[var(--border-ink)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-[var(--border-ink)]">
              <button
                type="button"
                onClick={() => setEditingScene(null)}
                className="px-3 py-1.5 text-xs font-heading font-bold border-2 border-[var(--border-ink)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[2px_2px_0px_var(--shadow-ink)] hover:bg-[var(--bg-surface-hover)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onSaveScene(editingScene);
                  setEditingScene(null);
                  onReload();
                }}
                className="px-4 py-1.5 text-xs font-heading font-black border-2 border-[var(--border-ink)] bg-[var(--pastel-yellow)] text-black shadow-[2px_2px_0px_var(--shadow-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
