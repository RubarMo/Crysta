import React, { useEffect, useState } from 'react';
import { Novel, StepProgress, Character, Scene, saveStepProgress, saveCharacter, deleteCharacter, saveScene, deleteScene } from '../lib';
import { WordCounter } from './WordCounter';
import { Save, Plus } from 'lucide-react';

interface WorkspaceProps {
  activeNovel: Novel;
  onUpdateNovel: (novel: Novel) => void;
  stepsProgress: StepProgress[];
  onReloadSteps: () => void;
  activeStep: number;
}

export const Workspace: React.FC<WorkspaceProps> = ({
  activeNovel,
  onUpdateNovel,
  stepsProgress,
  onReloadSteps,
  activeStep,
}) => {
  // Local states for novel attributes
  const [novelTitle, setNovelTitle] = useState(activeNovel.title);
  const [novelGenre, setNovelGenre] = useState(activeNovel.genre);
  const [novelAudience, setNovelAudience] = useState(activeNovel.target_audience);
  const [novelTargetWords, setNovelTargetWords] = useState(activeNovel.target_word_count);

  // Sync state with activeNovel changes
  useEffect(() => {
    setNovelTitle(activeNovel.title);
    setNovelGenre(activeNovel.genre);
    setNovelAudience(activeNovel.target_audience);
    setNovelTargetWords(activeNovel.target_word_count);
  }, [activeNovel]);

  const activeStepProgress = stepsProgress.find(p => p.step_number === activeStep) || {
    novel_id: activeNovel.id!,
    step_number: activeStep,
    content_text: '',
    is_completed: false,
  };

  const [stepText, setStepText] = useState(activeStepProgress.content_text);
  const [stepCompleted, setStepCompleted] = useState(activeStepProgress.is_completed);

  // Characters and Scenes State
  const [characters, setCharacters] = useState<Character[]>([]);
  const [editingCharacter, setEditingCharacter] = useState<Partial<Character> | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [editingScene, setEditingScene] = useState<Partial<Scene> | null>(null);

  // Top-level states for Step 5, 7, and 9 to follow React Rules of Hooks
  const [selectedCharIdStep5, setSelectedCharIdStep5] = useState<number | null>(null);
  const [selectedCharIdStep7, setSelectedCharIdStep7] = useState<number | null>(null);
  const [selectedSceneIdStep9, setSelectedSceneIdStep9] = useState<number | null>(null);

  // Copy Clipboard State
  const [copied, setCopied] = useState(false);

  // Sync step local state on tab switch
  useEffect(() => {
    const current = stepsProgress.find(p => p.step_number === activeStep);
    setStepText(current ? current.content_text : '');
    setStepCompleted(current ? current.is_completed : false);
  }, [activeStep, stepsProgress]);

  const loadCharactersAndScenes = async () => {
    if (!activeNovel.id) return;
    try {
      const { getCharacters: apiGetCharacters, getScenes: apiGetScenes } = await import('../lib');
      const chars = await apiGetCharacters(activeNovel.id);
      const scns = await apiGetScenes(activeNovel.id);
      setCharacters(chars);
      setScenes(scns);
    } catch (err) {
      console.error('Error loading characters or scenes', err);
    }
  };

  useEffect(() => {
    loadCharactersAndScenes();
  }, [activeNovel.id]);

  // Save Step Progress handler
  const triggerSaveStepProgress = async (text: string, completed: boolean) => {
    if (!activeNovel.id) return;
    try {
      await saveStepProgress(activeNovel.id, activeStep, text, completed);
      onReloadSteps();
    } catch (err: any) {
      console.error('Failed to save step progress', err);
      alert(`خطأ أثناء حفظ تقدم الخطوة: ${err}`);
    }
  };

  // Save Novel info handler
  const triggerSaveNovel = async () => {
    if (!activeNovel.id) return;
    try {
      const { updateNovel: apiUpdateNovel } = await import('../lib');
      await apiUpdateNovel(
        activeNovel.id,
        novelTitle,
        novelGenre,
        novelAudience,
        novelTargetWords
      );
      onUpdateNovel({
        ...activeNovel,
        title: novelTitle,
        genre: novelGenre,
        target_audience: novelAudience,
        target_word_count: novelTargetWords,
      });
    } catch (err: any) {
      console.error('Failed to update novel', err);
      alert(`خطأ أثناء حفظ بيانات الرواية: ${err}`);
    }
  };

  // Character Handlers
  const handleSaveCharacter = async (char: Partial<Character>) => {
    if (!activeNovel.id) return;
    try {
      const charToSave: Character = {
        id: char.id,
        novel_id: activeNovel.id,
        name: char.name || 'شخصية جديدة',
        motivation: char.motivation || '',
        goal: char.goal || '',
        conflict: char.conflict || '',
        epiphany: char.epiphany || '',
        one_paragraph_summary: char.one_paragraph_summary || '',
        full_synopsis: char.full_synopsis || '',
      };
      await saveCharacter(charToSave);
      setEditingCharacter(null);
      loadCharactersAndScenes();
    } catch (err) {
      console.error('Failed to save character', err);
    }
  };

  const handleDeleteCharacter = async (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذه الشخصية؟')) {
      try {
        await deleteCharacter(id);
        loadCharactersAndScenes();
      } catch (err) {
        console.error('Failed to delete character', err);
      }
    }
  };

  // Scene Handlers
  const handleSaveScene = async (scn: Partial<Scene>) => {
    if (!activeNovel.id) return;
    try {
      const scnToSave: Scene = {
        id: scn.id,
        novel_id: activeNovel.id,
        pov_character_id: scn.pov_character_id || null,
        setting: scn.setting || '',
        plot_thread: scn.plot_thread || '',
        what_happens: scn.what_happens || '',
        expected_word_count: scn.expected_word_count || 0,
        actual_word_count: scn.actual_word_count || 0,
      };
      await saveScene(scnToSave);
      setEditingScene(null);
      loadCharactersAndScenes();
      
      const updatedScenes = scenes.map(s => s.id === scn.id ? { ...s, ...scnToSave } : s);
      const totalWords = updatedScenes.reduce((sum, s) => sum + (s.actual_word_count || 0), 0);
      onUpdateNovel({
        ...activeNovel,
        current_word_count: totalWords
      });
    } catch (err) {
      console.error('Failed to save scene', err);
    }
  };

  const handleDeleteScene = async (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذا المشهد؟')) {
      try {
        await deleteScene(id, activeNovel.id!);
        loadCharactersAndScenes();
        
        const totalWords = scenes.filter(s => s.id !== id).reduce((sum, s) => sum + (s.actual_word_count || 0), 0);
        onUpdateNovel({
          ...activeNovel,
          current_word_count: totalWords
        });
      } catch (err) {
        console.error('Failed to delete scene', err);
      }
    }
  };

  const getStepText = (stepNum: number) => {
    const step = stepsProgress.find(p => p.step_number === stepNum);
    return step ? step.content_text : '';
  };

  const handleCopyMarkdown = (markdown: string) => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getExportMarkdown = () => {
    let md = `# رواية: ${activeNovel.title}\n`;
    md += `**النوع الأدبي:** ${activeNovel.genre}\n`;
    md += `**الجمهور المستهدف:** ${activeNovel.target_audience}\n`;
    md += `**عدد الكلمات المستهدف:** ${activeNovel.target_word_count} كلمة\n`;
    md += `**عدد الكلمات الفعلي:** ${activeNovel.current_word_count} كلمة\n\n`;

    md += `## الخطوة 1: ملخص الجملة الواحدة\n`;
    md += `${getStepText(1) || '_لم يكتب بعد_'}\n\n`;

    md += `## الخطوة 2: ملخص الفقرة الكاملة\n`;
    md += `${getStepText(2) || '_لم يكتب بعد_'}\n\n`;

    md += `## الخطوة 4: ملخص الصفحة الواحدة (توسيع الملخص)\n`;
    md += `${getStepText(4) || '_لم يكتب بعد_'}\n\n`;

    md += `## الخطوة 6: ملخص الصفحات الأربع\n`;
    md += `${getStepText(6) || '_لم يكتب بعد_'}\n\n`;

    md += `## السير الذاتية ومخططات الشخصيات (الخطوات 3، 5، 7)\n`;
    if (characters.length === 0) {
      md += `_لا توجد شخصيات مضافة_\n\n`;
    } else {
      characters.forEach((char) => {
        md += `### ${char.name}\n`;
        md += `- **الدافع الأساسي:** ${char.motivation || '_'}\n`;
        md += `- **الهدف:** ${char.goal || '_'}\n`;
        md += `- **الصراع القائم:** ${char.conflict || '_'}\n`;
        md += `- **لحظة التنوير:** ${char.epiphany || '_'}\n`;
        md += `- **ملخص الفقرة الواحدة:**\n${char.one_paragraph_summary || '_'}\n`;
        md += `- **الملخص الكامل الممتد:**\n${char.full_synopsis || '_'}\n\n`;
      });
    }

    md += `## قائمة ومسودة المشاهد (الخطوات 8، 9)\n`;
    if (scenes.length === 0) {
      md += `_لا توجد مشاهد مضافة_\n\n`;
    } else {
      scenes.forEach((scn, idx) => {
        const povName = characters.find(c => c.id === scn.pov_character_id)?.name || 'غير محدد';
        md += `### مشهد ${idx + 1}: ${scn.setting || 'بدون عنوان'}\n`;
        md += `- **شخصية وجهة النظر (POV):** ${povName}\n`;
        md += `- **خط الحبكة:** ${scn.plot_thread || '_'}\n`;
        md += `- **عدد الكلمات المتوقع:** ${scn.expected_word_count} كلمة | **الفعلي:** ${scn.actual_word_count} كلمة\n`;
        md += `- **ماذا يحدث:**\n${scn.what_happens || '_'}\n\n`;
      });
    }

    return md;
  };

  // ----------------------------------------------------
  // DASHBOARD VIEW
  // ----------------------------------------------------
  if (activeStep === 0) {
    const progressPercent = activeNovel.target_word_count > 0 
      ? Math.min(Math.round((activeNovel.current_word_count / activeNovel.target_word_count) * 100), 100) 
      : 0;

    return (
      <div className="max-w-3xl mx-auto p-8 space-y-8 fade-in font-cairo">
        <header className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">لوحة التحكم الرئيسية</h1>
          <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">تعديل معلومات الرواية الحالية ومتابعة الإحصائيات.</p>
        </header>

        {/* Word Count Progress */}
        <div className="bg-white dark:bg-[#181818] p-5 border border-zinc-200 dark:border-zinc-800 rounded space-y-2.5">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-zinc-400">تقدم كتابة الرواية</span>
            <span className="text-zinc-900 dark:text-zinc-100">{activeNovel.current_word_count} / {activeNovel.target_word_count} كلمة ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-1.5 rounded overflow-hidden">
            <div 
              className="bg-zinc-800 dark:bg-zinc-200 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Form Fields */}
        <div className="bg-white dark:bg-[#181818] p-5 border border-zinc-200 dark:border-zinc-800 rounded space-y-5">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pb-1">بيانات الرواية الأساسية</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500">عنوان الرواية</label>
              <input
                type="text"
                value={novelTitle}
                onChange={(e) => setNovelTitle(e.target.value)}
                onBlur={triggerSaveNovel}
                className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                placeholder="العنوان الحركي أو النهائي..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500">التصنيف الأدبي</label>
              <input
                type="text"
                value={novelGenre}
                onChange={(e) => setNovelGenre(e.target.value)}
                onBlur={triggerSaveNovel}
                className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                placeholder="مثال: دراما، خيال علمي..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500">الجمهور المستهدف</label>
              <input
                type="text"
                value={novelAudience}
                onChange={(e) => setNovelAudience(e.target.value)}
                onBlur={triggerSaveNovel}
                className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                placeholder="مثال: البالغين..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500">عدد الكلمات المستهدف</label>
              <input
                type="number"
                value={novelTargetWords || ''}
                onChange={(e) => setNovelTargetWords(Number(e.target.value) || 0)}
                onBlur={triggerSaveNovel}
                className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#181818] p-4 border border-zinc-200 dark:border-zinc-800 rounded">
            <span className="text-[10px] font-bold text-zinc-400 block">عدد الشخصيات</span>
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">{characters.length}</p>
          </div>

          <div className="bg-white dark:bg-[#181818] p-4 border border-zinc-200 dark:border-zinc-800 rounded">
            <span className="text-[10px] font-bold text-zinc-400 block">المشاهد المخططة</span>
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">{scenes.length}</p>
          </div>

          <div className="bg-white dark:bg-[#181818] p-4 border border-zinc-200 dark:border-zinc-800 rounded">
            <span className="text-[10px] font-bold text-zinc-400 block">المشاهد المنجزة</span>
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
              {scenes.filter(s => s.actual_word_count > 0).length} / {scenes.length}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const stepTitles: Record<number, { title: string; desc: string; limit?: number; hasRef?: number }> = {
    1: { title: 'ملخص الجملة الواحدة', desc: 'لخص روايتك بالكامل في جملة واحدة مكثفة. التركيز على الحبكة والنهاية. الحد الأقصى 50 كلمة.', limit: 50 },
    2: { title: 'ملخص الفقرة الكاملة', desc: 'قم بتوسيع جملة الملخص إلى فقرة كاملة توضح البداية، الأحداث الكبرى الثلاثة، والنهاية.', hasRef: 1 },
    4: { title: 'توسيع الملخص لصفحة كاملة', desc: 'قم بتوسيع الفقرات الخمسة من الخطوة الثانية إلى صفحة سردية كاملة تقدم حبكة أعمق وصراعات متصاعدة.', hasRef: 2 },
    6: { title: 'ملخص الصفحات الأربع', desc: 'قم بتوسيع الملخص السردي إلى 4 صفحات كاملة لتوضيح كافة تفاصيل تطور القصة والمسار العام للرواية.', hasRef: 4 },
  };

  // ----------------------------------------------------
  // WRITING STEPS (1, 2, 4, 6)
  // ----------------------------------------------------
  if (activeStep === 1 || activeStep === 2 || activeStep === 4 || activeStep === 6) {
    const meta = stepTitles[activeStep];
    return (
      <div className="max-w-3xl mx-auto p-8 space-y-6 fade-in font-cairo">
        <header className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{meta.title}</h1>
            <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-0.5">{meta.desc}</p>
          </div>
          <div>
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-zinc-500">
              <input
                type="checkbox"
                checked={stepCompleted}
                onChange={(e) => {
                  const check = e.target.checked;
                  setStepCompleted(check);
                  triggerSaveStepProgress(stepText, check);
                }}
                className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0"
              />
              <span>تعليم كـ مكتملة</span>
            </label>
          </div>
        </header>

        {meta.hasRef && (
          <div className="bg-[#fcfbfa] dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 p-4 rounded text-xs leading-relaxed text-zinc-500 whitespace-pre-line">
            <span className="font-bold text-zinc-400 block mb-1">مرجع للخطوة {meta.hasRef}:</span>
            {getStepText(meta.hasRef) || 'لم تتم كتابة الخطوة المرجعية بعد.'}
          </div>
        )}

        {/* Paper Sheet look-alike writing space */}
        <div className="space-y-2">
          <textarea
            value={stepText}
            onChange={(e) => setStepText(e.target.value)}
            onBlur={() => triggerSaveStepProgress(stepText, stepCompleted)}
            className="w-full min-h-[350px] text-sm leading-loose bg-white dark:bg-[#181818] border border-zinc-200 dark:border-zinc-800 p-4 rounded focus:outline-none focus:border-zinc-500 focus:ring-0 resize-y placeholder:text-zinc-300"
            placeholder="اكتب هنا... يتم الحفظ تلقائياً عند مغادرة حقل النص."
          />
          <div className="flex justify-end">
            <WordCounter text={stepText} maxWords={meta.limit} />
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 3: CHARACTER BIOS (CRUD)
  // ----------------------------------------------------
  if (activeStep === 3) {
    return (
      <div className="max-w-3xl mx-auto p-8 space-y-6 fade-in font-cairo">
        <header className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">السير الذاتية للشخصيات</h1>
            <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-0.5">أضف الشخصيات وحدد رغباتهم وصراعاتهم الأساسية.</p>
          </div>
          {!editingCharacter && (
            <button
              onClick={() => setEditingCharacter({ name: '', motivation: '', goal: '', conflict: '', epiphany: '', one_paragraph_summary: '', full_synopsis: '' })}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#1a1a1a] hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors font-semibold rounded"
            >
              <Plus className="w-3 h-3" />
              <span>إضافة شخصية</span>
            </button>
          )}
        </header>

        {editingCharacter ? (
          <div className="bg-white dark:bg-[#181818] p-5 border border-zinc-200 dark:border-zinc-800 rounded space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              {editingCharacter.id ? 'تعديل الشخصية' : 'إضافة شخصية جديدة'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-500 font-bold">الاسم</label>
                <input
                  type="text"
                  value={editingCharacter.name || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, name: e.target.value })}
                  className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-500 font-bold">الدافع</label>
                <input
                  type="text"
                  value={editingCharacter.motivation || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, motivation: e.target.value })}
                  className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-500 font-bold">الهدف</label>
                <input
                  type="text"
                  value={editingCharacter.goal || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, goal: e.target.value })}
                  className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-500 font-bold">الصراع</label>
                <input
                  type="text"
                  value={editingCharacter.conflict || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, conflict: e.target.value })}
                  className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] text-zinc-500 font-bold">لحظة التنوير</label>
                <input
                  type="text"
                  value={editingCharacter.epiphany || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, epiphany: e.target.value })}
                  className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                />
              </div>

              <div className="space-y-1 md:col-span-2 relative">
                <label className="text-[11px] text-zinc-500 font-bold">ملخص السيرة (فقرة واحدة)</label>
                <textarea
                  value={editingCharacter.one_paragraph_summary || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, one_paragraph_summary: e.target.value })}
                  className="w-full min-h-[100px] text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0 resize-y"
                />
                <div className="flex justify-end mt-1">
                  <WordCounter text={editingCharacter.one_paragraph_summary || ''} />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setEditingCharacter(null)}
                className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 text-xs rounded hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleSaveCharacter(editingCharacter)}
                className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 text-xs rounded transition-colors font-bold"
              >
                <Save className="w-3.5 h-3.5" />
                <span>حفظ الشخصية</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {characters.length === 0 ? (
              <div className="text-center py-10 bg-white dark:bg-[#181818] border border-zinc-200 dark:border-zinc-800 rounded text-zinc-400 text-xs">
                لم تتم إضافة شخصيات بعد. أضف أول شخصية لبناء تفاصيلها.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {characters.map((char) => (
                  <div key={char.id} className="bg-white dark:bg-[#181818] p-4 border border-zinc-200 dark:border-zinc-800 rounded flex flex-col justify-between group">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-200">{char.name}</h3>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingCharacter(char)}
                            className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold"
                          >
                            تعديل
                          </button>
                          <button
                            onClick={() => handleDeleteCharacter(char.id!)}
                            className="text-[10px] text-rose-500 hover:text-rose-600 font-bold"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] leading-relaxed text-zinc-500 line-clamp-3">
                        {char.one_paragraph_summary || 'لا يوجد ملخص مضاف.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 flex justify-between">
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-zinc-500">
                <input
                  type="checkbox"
                  checked={stepCompleted}
                  onChange={(e) => {
                    const check = e.target.checked;
                    setStepCompleted(check);
                    triggerSaveStepProgress('', check);
                  }}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0"
                />
                <span>تحديد الخطوة 3 كـ مكتملة</span>
              </label>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 5: CHARACTER SYNOPSES
  // ----------------------------------------------------
  if (activeStep === 5) {
    const selectedChar = characters.find(c => c.id === selectedCharIdStep5) || null;

    const handleSaveSynopsis = async (text: string) => {
      if (!selectedChar) return;
      try {
        await saveCharacter({
          ...selectedChar,
          full_synopsis: text
        });
        loadCharactersAndScenes();
      } catch (err) {
        console.error('Failed to save character synopsis', err);
      }
    };

    return (
      <div className="max-w-3xl mx-auto p-8 space-y-6 fade-in font-cairo">
        <header className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">توسيع ملخصات الشخصيات</h1>
            <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-0.5">اختر شخصية لتوسيع سيرتها المقتضبة إلى ملخص سردي كامل ومفصل.</p>
          </div>
          <div>
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-zinc-500">
              <input
                type="checkbox"
                checked={stepCompleted}
                onChange={(e) => {
                  const check = e.target.checked;
                  setStepCompleted(check);
                  triggerSaveStepProgress('', check);
                }}
                className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0"
              />
              <span>تحديد كـ مكتملة</span>
            </label>
          </div>
        </header>

        {characters.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-[#181818] border border-zinc-200 dark:border-zinc-800 rounded text-zinc-400 text-xs">
            يرجى إضافة شخصيات في الخطوة 3 أولاً.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1 space-y-1 border-l border-zinc-200/30 dark:border-zinc-800/30 pl-2">
              <span className="text-[10px] font-bold text-zinc-400 block pb-1.5">الشخصيات</span>
              {characters.map((char) => (
                <button
                  key={char.id}
                  onClick={() => setSelectedCharIdStep5(char.id!)}
                  className={`w-full text-start p-2 rounded text-xs transition-colors ${
                    selectedCharIdStep5 === char.id
                      ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-200 font-bold'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {char.name}
                </button>
              ))}
            </div>

            <div className="md:col-span-3 space-y-4">
              {selectedChar ? (
                <>
                  <div className="bg-[#fcfbfa] dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 p-4 rounded text-xs leading-relaxed text-zinc-500">
                    <span className="font-bold text-zinc-400 block mb-1">السيرة المرجعية لـ {selectedChar.name}:</span>
                    {selectedChar.one_paragraph_summary || 'لا توجد سيرة مقتضبة مكتوبة.'}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 block">الملخص السردي الممتد (Full Synopsis)</label>
                    <textarea
                      value={selectedChar.full_synopsis || ''}
                      onChange={(e) => {
                        const updated = characters.map(c => c.id === selectedChar.id ? { ...c, full_synopsis: e.target.value } : c);
                        setCharacters(updated);
                      }}
                      onBlur={(e) => handleSaveSynopsis(e.target.value)}
                      className="w-full min-h-[300px] text-xs leading-loose bg-white dark:bg-[#181818] border border-zinc-200 dark:border-zinc-800 p-3 rounded focus:outline-none focus:border-zinc-500 focus:ring-0 resize-y"
                      placeholder={`توسيع مسار شخصية ${selectedChar.name} في أحداث الرواية...`}
                    />
                    <div className="flex justify-end">
                      <WordCounter text={selectedChar.full_synopsis || ''} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded text-zinc-400 text-xs">
                  الرجاء اختيار شخصية من القائمة لبدء الكتابة.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 7: CHARACTER CHARTS (Detailed CRUD)
  // ----------------------------------------------------
  if (activeStep === 7) {
    const selectedChar = characters.find(c => c.id === selectedCharIdStep7) || null;

    const handleSaveChart = async (char: Character) => {
      try {
        await saveCharacter(char);
        loadCharactersAndScenes();
      } catch (err) {
        console.error('Failed to save character chart', err);
      }
    };

    return (
      <div className="max-w-3xl mx-auto p-8 space-y-6 fade-in font-cairo">
        <header className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">مخططات تفاصيل الشخصيات</h1>
            <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-0.5">دراسة عميقة تفصيلية لعواطف وتوجهات ودوافع طاقم الرواية.</p>
          </div>
          <div>
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-zinc-500">
              <input
                type="checkbox"
                checked={stepCompleted}
                onChange={(e) => {
                  const check = e.target.checked;
                  setStepCompleted(check);
                  triggerSaveStepProgress('', check);
                }}
                className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0"
              />
              <span>تحديد كـ مكتملة</span>
            </label>
          </div>
        </header>

        {characters.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-[#181818] border border-zinc-200 dark:border-zinc-800 rounded text-zinc-400 text-xs">
            يرجى إضافة شخصيات في الخطوة 3 أولاً.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1 space-y-1 border-l border-zinc-200/30 dark:border-zinc-800/30 pl-2">
              <span className="text-[10px] font-bold text-zinc-400 block pb-1.5">الشخصيات</span>
              {characters.map((char) => (
                <button
                  key={char.id}
                  onClick={() => setSelectedCharIdStep7(char.id!)}
                  className={`w-full text-start p-2 rounded text-xs transition-colors ${
                    selectedCharIdStep7 === char.id
                      ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-200 font-bold'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {char.name}
                </button>
              ))}
            </div>

            <div className="md:col-span-3">
              {selectedChar ? (
                <div className="bg-white dark:bg-[#181818] p-5 border border-zinc-200 dark:border-zinc-800 rounded space-y-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pb-1">مخطط التفاصيل: {selectedChar.name}</h3>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-500">الاسم بالكامل</label>
                      <input
                        type="text"
                        value={selectedChar.name}
                        onChange={(e) => {
                          const updated = characters.map(c => c.id === selectedChar.id ? { ...c, name: e.target.value } : c);
                          setCharacters(updated);
                        }}
                        onBlur={() => handleSaveChart(selectedChar)}
                        className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-500">الدافع والدافعية الداخلية</label>
                        <textarea
                          value={selectedChar.motivation}
                          onChange={(e) => {
                            const updated = characters.map(c => c.id === selectedChar.id ? { ...c, motivation: e.target.value } : c);
                            setCharacters(updated);
                          }}
                          onBlur={() => handleSaveChart(selectedChar)}
                          className="w-full text-xs min-h-[70px] rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-500">الهدف والمسعى الخارجي</label>
                        <textarea
                          value={selectedChar.goal}
                          onChange={(e) => {
                            const updated = characters.map(c => c.id === selectedChar.id ? { ...c, goal: e.target.value } : c);
                            setCharacters(updated);
                          }}
                          onBlur={() => handleSaveChart(selectedChar)}
                          className="w-full text-xs min-h-[70px] rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-500">العوائق والصراعات الموجهة</label>
                        <textarea
                          value={selectedChar.conflict}
                          onChange={(e) => {
                            const updated = characters.map(c => c.id === selectedChar.id ? { ...c, conflict: e.target.value } : c);
                            setCharacters(updated);
                          }}
                          onBlur={() => handleSaveChart(selectedChar)}
                          className="w-full text-xs min-h-[70px] rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-500">لحظة التنوير والتحول</label>
                        <textarea
                          value={selectedChar.epiphany}
                          onChange={(e) => {
                            const updated = characters.map(c => c.id === selectedChar.id ? { ...c, epiphany: e.target.value } : c);
                            setCharacters(updated);
                          }}
                          onBlur={() => handleSaveChart(selectedChar)}
                          className="w-full text-xs min-h-[70px] rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded text-zinc-400 text-xs">
                  الرجاء اختيار شخصية من القائمة للبدء.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 8: SCENE LIST SPREADSHEET (Table Grid)
  // ----------------------------------------------------
  if (activeStep === 8) {
    return (
      <div className="max-w-3xl mx-auto p-8 space-y-6 fade-in font-cairo">
        <header className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">قائمة المشاهد والتخطيط</h1>
            <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-0.5">تخطيط مشاهد الرواية، وتحديد شخصيات وجهات النظر والمواقع.</p>
          </div>
          {!editingScene && (
            <button
              onClick={() => setEditingScene({ pov_character_id: null, setting: '', plot_thread: '', what_happens: '', expected_word_count: 500, actual_word_count: 0 })}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#1a1a1a] hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors font-semibold rounded"
            >
              <Plus className="w-3 h-3" />
              <span>إضافة مشهد</span>
            </button>
          )}
        </header>

        {editingScene ? (
          <div className="bg-white dark:bg-[#181818] p-5 border border-zinc-200 dark:border-zinc-800 rounded space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pb-1">
              {editingScene.id ? 'تعديل المشهد' : 'إضافة مشهد جديد'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-500">شخصية الـ POV</label>
                {characters.length === 0 ? (
                  <div className="text-[10px] text-rose-500 p-2 bg-rose-50 dark:bg-rose-950/20 rounded">
                    يرجى إضافة شخصيات في الخطوة 3 أولاً.
                  </div>
                ) : (
                  <select
                    value={editingScene.pov_character_id || ''}
                    onChange={(e) => setEditingScene({ ...editingScene, pov_character_id: Number(e.target.value) || null })}
                    className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                  >
                    <option value="">اختر الشخصية...</option>
                    {characters.map(c => (
                      <option key={c.id} value={c.id!}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-500">الموقع والزمان</label>
                <input
                  type="text"
                  value={editingScene.setting || ''}
                  onChange={(e) => setEditingScene({ ...editingScene, setting: e.target.value })}
                  className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                  placeholder="مثال: الغرفة الرئيسية..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-500">خط الحبكة</label>
                <input
                  type="text"
                  value={editingScene.plot_thread || ''}
                  onChange={(e) => setEditingScene({ ...editingScene, plot_thread: e.target.value })}
                  className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                  placeholder="الحبكة الأساسية..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-500">عدد الكلمات المتوقع</label>
                <input
                  type="number"
                  value={editingScene.expected_word_count || ''}
                  onChange={(e) => setEditingScene({ ...editingScene, expected_word_count: Number(e.target.value) || 0 })}
                  className="w-full text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                />
              </div>

              <div className="space-y-1 md:col-span-2 relative">
                <label className="text-[11px] font-bold text-zinc-500">سياق المشهد (ماذا يحدث)</label>
                <textarea
                  value={editingScene.what_happens || ''}
                  onChange={(e) => setEditingScene({ ...editingScene, what_happens: e.target.value })}
                  className="w-full min-h-[100px] text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0 resize-y"
                  placeholder="صِف الحدث الأساسي..."
                />
                <div className="flex justify-end mt-1">
                  <WordCounter text={editingScene.what_happens || ''} />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setEditingScene(null)}
                className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 text-xs rounded hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleSaveScene(editingScene)}
                className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 text-xs rounded transition-colors font-bold"
              >
                <Save className="w-3.5 h-3.5" />
                <span>حفظ المشهد</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {scenes.length === 0 ? (
              <div className="text-center py-10 bg-white dark:bg-[#181818] border border-zinc-200 dark:border-zinc-800 rounded text-zinc-400 text-xs">
                لم يتم تخطيط مشاهد بعد.
              </div>
            ) : (
              <div className="bg-white dark:bg-[#181818] rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-start" dir="rtl">
                    <thead className="text-zinc-400 uppercase bg-[#fbfbfa] dark:bg-[#151515] border-b border-zinc-200 dark:border-zinc-800">
                      <tr>
                        <th className="px-3 py-2 text-start font-bold">#</th>
                        <th className="px-3 py-2 text-start font-bold">شخصية الـ POV</th>
                        <th className="px-3 py-2 text-start font-bold">الموقع والزمان</th>
                        <th className="px-3 py-2 text-start font-bold">خط الحبكة</th>
                        <th className="px-3 py-2 text-start font-bold">المتوقع</th>
                        <th className="px-3 py-2 text-start font-bold">العمليات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {scenes.map((scn, idx) => {
                        const povName = characters.find(c => c.id === scn.pov_character_id)?.name || 'غير محدد';
                        return (
                          <tr key={scn.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                            <td className="px-3 py-2 font-bold text-zinc-900 dark:text-zinc-100">{idx + 1}</td>
                            <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{povName}</td>
                            <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 truncate max-w-[120px]">{scn.setting || '_'}</td>
                            <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{scn.plot_thread || '_'}</td>
                            <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{scn.expected_word_count} كلمة</td>
                            <td className="px-3 py-2 flex gap-3">
                              <button
                                onClick={() => setEditingScene(scn)}
                                className="text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-bold"
                              >
                                تعديل
                              </button>
                              <button
                                onClick={() => handleDeleteScene(scn.id!)}
                                className="text-[10px] text-rose-500 hover:text-rose-600 font-bold"
                              >
                                حذف
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center border-t border-zinc-200 dark:border-zinc-800 pt-4">
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-zinc-500">
                <input
                  type="checkbox"
                  checked={stepCompleted}
                  onChange={(e) => {
                    const check = e.target.checked;
                    setStepCompleted(check);
                    triggerSaveStepProgress('', check);
                  }}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0"
                />
                <span>تحديد الخطوة 8 كـ مكتملة</span>
              </label>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 9: SCENE NARRATIVE
  // ----------------------------------------------------
  if (activeStep === 9) {
    const selectedScene = scenes.find(s => s.id === selectedSceneIdStep9) || null;

    const handleSaveNarrative = async (whatHappensText: string, actualWords: number) => {
      if (!selectedScene) return;
      try {
        const scnToSave = {
          ...selectedScene,
          what_happens: whatHappensText,
          actual_word_count: actualWords
        };
        await saveScene(scnToSave);
        loadCharactersAndScenes();
        
        const updatedScenes = scenes.map(s => s.id === selectedScene.id ? scnToSave : s);
        const totalWords = updatedScenes.reduce((sum, s) => sum + (s.actual_word_count || 0), 0);
        onUpdateNovel({
          ...activeNovel,
          current_word_count: totalWords
        });
      } catch (err) {
        console.error('Failed to save scene narrative', err);
      }
    };

    return (
      <div className="max-w-3xl mx-auto p-8 space-y-6 fade-in font-cairo">
        <header className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">سرد أحداث المشاهد والمسودة</h1>
            <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-0.5">اختر مشهداً واكتب السرد الكامل له بالتفصيل.</p>
          </div>
          <div>
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-zinc-500">
              <input
                type="checkbox"
                checked={stepCompleted}
                onChange={(e) => {
                  const check = e.target.checked;
                  setStepCompleted(check);
                  triggerSaveStepProgress('', check);
                }}
                className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0"
              />
              <span>تحديد كـ مكتملة</span>
            </label>
          </div>
        </header>

        {scenes.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-[#181818] border border-zinc-200 dark:border-zinc-800 rounded text-zinc-400 text-xs">
            يرجى إضافة وتخطيط مشاهدك في الخطوة 8 أولاً.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1 space-y-1 border-l border-zinc-200/30 dark:border-zinc-800/30 pl-2">
              <span className="text-[10px] font-bold text-zinc-400 block pb-1.5">قائمة المشاهد</span>
              {scenes.map((scn, idx) => (
                <button
                  key={scn.id}
                  onClick={() => setSelectedSceneIdStep9(scn.id!)}
                  className={`w-full text-start p-2 rounded text-xs transition-colors ${
                    selectedSceneIdStep9 === scn.id
                      ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-200 font-bold'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  مشهد {idx + 1}: {scn.setting || 'بدون اسم'}
                </button>
              ))}
            </div>

            <div className="md:col-span-3 space-y-4">
              {selectedScene ? (
                <>
                  <div className="bg-[#fcfbfa] dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 p-4 rounded text-xs leading-relaxed text-zinc-500">
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="font-bold">POV:</span> {characters.find(c => c.id === selectedScene.pov_character_id)?.name || 'غير محدد'}</div>
                      <div><span className="font-bold">الحبكة:</span> {selectedScene.plot_thread || 'غير محدد'}</div>
                      <div className="col-span-2"><span className="font-bold">الموقع والزمان:</span> {selectedScene.setting || 'غير محدد'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-400">عدد الكلمات المتوقع</span>
                      <div className="bg-zinc-100 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300 text-xs px-3 py-2 rounded">
                        {selectedScene.expected_word_count} كلمة
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-400">عدد الكلمات الفعلي المنجز</span>
                      <input
                        type="number"
                        value={selectedScene.actual_word_count || ''}
                        onChange={(e) => {
                          const updated = scenes.map(s => s.id === selectedScene.id ? { ...s, actual_word_count: Number(e.target.value) || 0 } : s);
                          setScenes(updated);
                        }}
                        onBlur={(e) => handleSaveNarrative(selectedScene.what_happens, Number(e.target.value) || 0)}
                        className="w-full text-xs font-bold rounded border border-zinc-200 dark:border-zinc-800 bg-[#fbfbfa] dark:bg-[#121212] p-2 focus:outline-none focus:border-zinc-500 focus:ring-0"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 block">كتابة سرد المشهد</label>
                    <textarea
                      value={selectedScene.what_happens}
                      onChange={(e) => {
                        const updated = scenes.map(s => s.id === selectedScene.id ? { ...s, what_happens: e.target.value } : s);
                        setScenes(updated);
                      }}
                      onBlur={(e) => handleSaveNarrative(e.target.value, selectedScene.actual_word_count)}
                      className="w-full min-h-[300px] text-xs leading-loose bg-white dark:bg-[#181818] border border-zinc-200 dark:border-zinc-800 p-3 rounded focus:outline-none focus:border-zinc-500 focus:ring-0 resize-y"
                      placeholder="ابدأ بكتابة مسودة أحداث هذا المشهد بالتفصيل..."
                    />
                    <div className="flex justify-end">
                      <WordCounter text={selectedScene.what_happens} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded text-zinc-400 text-xs">
                  الرجاء اختيار مشهد من القائمة لبدء الكتابة.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // STEP 10: GENERATE EXPORT VIEW
  // ----------------------------------------------------
  if (activeStep === 10) {
    const mdContent = getExportMarkdown();

    return (
      <div className="max-w-3xl mx-auto p-8 space-y-6 fade-in font-cairo">
        <header className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">تجميع وتصدير المسودة</h1>
            <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-0.5">تم تجميع كافة الخطوات والمخططات والسيناريوهات المكتوبة في قالب تصدير موحد.</p>
          </div>
          <button
            onClick={() => handleCopyMarkdown(mdContent)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#1a1a1a] hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors font-semibold rounded"
          >
            {copied ? (
              <span className="text-emerald-500">تم نسخ التصدير!</span>
            ) : (
              <span>نسخ كـ Markdown</span>
            )}
          </button>
        </header>

        <div className="bg-[#fdfdfd] dark:bg-[#181818] p-5 border border-zinc-200 dark:border-zinc-800 rounded max-h-[500px] overflow-y-auto">
          <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-zinc-800 dark:text-zinc-200 font-medium select-text">
            {mdContent}
          </pre>
        </div>

        <div className="flex justify-between items-center border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-zinc-500">
            <input
              type="checkbox"
              checked={stepCompleted}
              onChange={(e) => {
                const check = e.target.checked;
                setStepCompleted(check);
                triggerSaveStepProgress('', check);
              }}
              className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0"
            />
            <span>تأكيد تجميع وتصدير مسودة الرواية</span>
          </label>
        </div>
      </div>
    );
  }

  return null;
};
