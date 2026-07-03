import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Workspace } from "./components/Workspace";
import { ThemeToggle } from "./components/ThemeToggle";
import { Novel, StepProgress, getNovels, createNovel, deleteNovel, getStepsProgress } from "./lib";
import { BookOpen, Plus } from "lucide-react";

function App() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [activeNovelId, setActiveNovelId] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [stepsProgress, setStepsProgress] = useState<StepProgress[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // Load novels
  const loadNovels = async (selectLatestId?: number) => {
    try {
      const list = await getNovels();
      setNovels(list);
      setErrorMessage(null);
      
      if (selectLatestId) {
        setActiveNovelId(selectLatestId);
      } else if (list.length > 0 && activeNovelId === null) {
        setActiveNovelId(list[0].id || null);
      }
    } catch (err: any) {
      console.error("Failed to load novels", err);
      setErrorMessage(String(err));
    } finally {
      setLoading(false);
    }
  };

  // Load steps progress for the active novel
  const loadStepsProgress = async () => {
    if (activeNovelId === null) {
      setStepsProgress([]);
      return;
    }
    try {
      const progress = await getStepsProgress(activeNovelId);
      setStepsProgress(progress);
    } catch (err) {
      console.error("Failed to load steps progress", err);
    }
  };

  useEffect(() => {
    loadNovels();
  }, []);

  useEffect(() => {
    loadStepsProgress();
  }, [activeNovelId]);

  const handleCreateNovel = async () => {
    try {
      const newId = await createNovel("رواية جديدة", "عام", "كافة القراء", 50000);
      await loadNovels(newId);
      setActiveStep(0); // Go to dashboard
    } catch (err: any) {
      console.error("Failed to create novel", err);
      alert(`خطأ في إنشاء الرواية: ${err}`);
    }
  };

  const handleDeleteNovel = async (id: number) => {
    try {
      await deleteNovel(id);
      if (activeNovelId === id) {
        setActiveNovelId(null);
        setStepsProgress([]);
      }
      await loadNovels();
    } catch (err) {
      console.error("Failed to delete novel", err);
    }
  };

  const handleUpdateNovelLocally = (updated: Novel) => {
    setNovels(prev => prev.map(n => n.id === updated.id ? updated : n));
  };

  const activeNovel = novels.find(n => n.id === activeNovelId) || null;

  return (
    <div className="flex h-screen bg-[#fcfbfa] text-[#1c1917] dark:bg-[#121212] dark:text-[#e7e5e4] overflow-hidden font-cairo">
      {/* Right Sidebar (Navigation) */}
      <Sidebar
        novels={novels}
        activeNovelId={activeNovelId}
        onSelectNovel={(id) => {
          setActiveNovelId(id);
          setActiveStep(0);
        }}
        onCreateNovel={handleCreateNovel}
        onDeleteNovel={handleDeleteNovel}
        activeStep={activeStep}
        onSelectStep={setActiveStep}
        stepsProgress={stepsProgress}
      />

      {/* Main workspace */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top bar with Toggle / Logo */}
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181818] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide text-zinc-900 dark:text-zinc-50">
              Snowflake Arabic
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {errorMessage && (
              <span className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-2.5 py-1 rounded">
                خطأ الاتصال: {errorMessage}
              </span>
            )}
            <button
              onClick={() => setShowHelpModal(true)}
              className="text-xs px-2.5 py-1.5 border border-zinc-350 dark:border-zinc-700 bg-white dark:bg-[#1a1a1a] hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors font-semibold rounded text-zinc-700 dark:text-zinc-300 cursor-pointer"
            >
              دليل Snowflake
            </button>
            <ThemeToggle />
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-400">
              جاري تحميل الروايات والبيانات...
            </div>
          ) : activeNovel ? (
            <Workspace
              activeNovel={activeNovel}
              onUpdateNovel={handleUpdateNovelLocally}
              stepsProgress={stepsProgress}
              onReloadSteps={loadStepsProgress}
              activeStep={activeStep}
            />
          ) : (
            <div className="max-w-4xl mx-auto p-8 space-y-8 fade-in font-cairo select-text">
              {/* Header */}
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5 flex justify-between items-end">
                <div>
                  <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">رواياتك ومشاريعك</h1>
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">اختر رواية لإكمال الكتابة والتخطيط، أو أنشئ مشروعاً جديداً.</p>
                </div>
                <button
                  onClick={handleCreateNovel}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 border border-zinc-350 dark:border-zinc-700 bg-white dark:bg-[#1a1a1a] hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors font-semibold rounded text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إنشاء رواية جديدة</span>
                </button>
              </div>

              {/* Stats Summary */}
              {novels.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-[#181818] p-4 border border-zinc-200 dark:border-zinc-800 rounded">
                    <span className="text-[10px] font-bold text-zinc-400 block">إجمالي الروايات</span>
                    <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">{novels.length}</p>
                  </div>
                  <div className="bg-white dark:bg-[#181818] p-4 border border-zinc-200 dark:border-zinc-800 rounded">
                    <span className="text-[10px] font-bold text-zinc-400 block">الكلمات المكتوبة</span>
                    <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
                      {novels.reduce((sum, n) => sum + n.current_word_count, 0).toLocaleString()} كلمة
                    </p>
                  </div>
                  <div className="bg-white dark:bg-[#181818] p-4 border border-zinc-200 dark:border-zinc-800 rounded">
                    <span className="text-[10px] font-bold text-zinc-400 block">متوسط الكلمات المستهدف</span>
                    <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
                      {novels.length > 0 
                        ? Math.round(novels.reduce((sum, n) => sum + n.target_word_count, 0) / novels.length).toLocaleString()
                        : 0} كلمة
                    </p>
                  </div>
                </div>
              )}

              {/* Novels Grid */}
              {novels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded bg-white dark:bg-[#181818]">
                  <BookOpen className="w-10 h-10 text-zinc-300 dark:text-zinc-700 stroke-[1.2]" />
                  <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">لا توجد روايات مضافة بعد</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed font-cairo">
                    ابدأ روايتك الأولى الآن! ستساعدك طريقة سنوفليك على هيكلة أفكارك خطوة بخطوة.
                  </p>
                  <button
                    onClick={handleCreateNovel}
                    className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-bold transition-all rounded cursor-pointer"
                  >
                    ابدأ رواية جديدة
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {novels.map((novel) => {
                    const progressPercent = novel.target_word_count > 0 
                      ? Math.min(Math.round((novel.current_word_count / novel.target_word_count) * 100), 100) 
                      : 0;
                    return (
                      <div 
                        key={novel.id}
                        onClick={() => {
                          setActiveNovelId(novel.id!);
                          setActiveStep(0);
                        }}
                        className="bg-white dark:bg-[#181818] p-5 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 rounded cursor-pointer transition-all duration-150 flex flex-col justify-between h-40 group relative"
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-200 group-hover:text-zinc-600 dark:group-hover:text-white transition-colors">
                              {novel.title}
                            </h3>
                            <span className="text-[10px] bg-zinc-100 dark:bg-zinc-850 px-2 py-0.5 rounded text-zinc-505 dark:text-zinc-400 font-medium">
                              {novel.genre || 'عام'}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2">الجمهور: {novel.target_audience || 'كافة القراء'}</p>
                        </div>

                        <div className="space-y-1.5 pt-4">
                          <div className="flex justify-between items-center text-[10px] text-zinc-400">
                            <span>التقدم: {novel.current_word_count.toLocaleString()} / {novel.target_word_count.toLocaleString()} كلمة</span>
                            <span>{progressPercent}%</span>
                          </div>
                          <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-1 rounded overflow-hidden">
                            <div 
                              className="bg-zinc-800 dark:bg-zinc-200 h-full transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Hover Quick Delete */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('هل أنت متأكد من حذف هذه الرواية؟')) {
                              handleDeleteNovel(novel.id!);
                            }
                          }}
                          className="absolute top-2 left-2 p-1.5 text-zinc-300 hover:text-rose-500 dark:text-zinc-700 dark:hover:text-rose-450 opacity-0 group-hover:opacity-100 transition-opacity rounded cursor-pointer"
                          title="حذف الرواية"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div 
          onClick={() => setShowHelpModal(false)}
          className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#181818] border border-zinc-200 dark:border-zinc-800 rounded max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl overflow-hidden font-cairo"
          >
            <header className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">دليل طريقة سنوفليك (Snowflake Method)</h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-205 cursor-pointer font-bold border border-zinc-300 dark:border-zinc-700 px-2 py-1 rounded hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                إغلاق
              </button>
            </header>
            
            <div className="p-5 overflow-y-auto text-xs text-zinc-650 dark:text-zinc-350 space-y-4 select-text leading-relaxed">
              <p>
                <strong>طريقة سنوفليك (Snowflake Method)</strong> هي تقنية لتصميم وتخطيط الروايات ابتكرها الكاتب راندي إنجرمانسن. تعتمد الفكرة على البدء بـ "ندفة ثلج" صغيرة بسيطة (فكرة أساسية في جملة واحدة) ثم توسيعها وتفريعها خطوة بخطوة حتى تصبح هيكلاً كاملاً جاهزاً للكتابة.
              </p>
              
              <div className="space-y-4 border-t border-zinc-150 dark:border-zinc-850 pt-4">
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100">الخطوة 1: ملخص الجملة الواحدة</h3>
                  <p className="mt-1">اكتب ملخصاً لروايتك في جملة واحدة (أقل من 15 كلمة). تجنب الأسماء، ركّز على الشخصية الرئيسية، العقبة أو الصراع الأكبر، والرهان النهائي.</p>
                </div>
                
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100">الخطوة 2: ملخص الفقرة الكاملة</h3>
                  <p className="mt-1">وسّع الجملة إلى فقرة كاملة (5 جمل). جملة تصف البداية والدافع، 3 جمل تصف الأزمات الثلاث الرئيسية (مفارق الحبكة)، وجملة تصف النهاية.</p>
                </div>
                
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100">الخطوة 3: السير الذاتية للشخصيات</h3>
                  <p className="mt-1">حدّد بطاقة شخصية لكل بطل أساسي. اكتب الاسم، الدافع (ماذا يريد)، الهدف (ماذا سيفعل)، الصراع (ما يمنعه)، ولحظة التنوير (كيف سيتغير).</p>
                </div>
                
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100">الخطوة 4: ملخص الصفحة الكاملة</h3>
                  <p className="mt-1">خذ كل جملة من الخطوة 2 وقوم بتوسيعها إلى فقرة كاملة لتتحول الفقرة المبدئية إلى صفحة كاملة تلخص كامل أحداث الرواية.</p>
                </div>
                
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100">الخطوة 5: ملخصات الشخصيات</h3>
                  <p className="mt-1">اكتب ملخصاً سردياً تفصيلياً لرحلة كل بطل أساسي من وجهة نظره الشخصية (POV)، لتفهم كيف يرى هو الحبكة وكيف يتفاعل مع الأحداث.</p>
                </div>
                
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100">الخطوة 6: ملخص الصفحات الأربع</h3>
                  <p className="mt-1">قم بتوسيع ملخص الصفحة الواحدة (الخطوة 4) إلى 4 صفحات كاملة لتغطية الحبكات الفرعية والمشكلات الثانوية، وصقل وتيرة الأحداث.</p>
                </div>
                
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100">الخطوة 7: مخططات تفاصيل الشخصيات</h3>
                  <p className="mt-1">اصنع دراسة عاطفية وجسدية كاملة للشخصيات. دوّن تفاصيل المظهر، العادات، الخلفية التاريخية، وتطور رحلتهم الشخصية العاطفية.</p>
                </div>
                
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100">الخطوة 8: قائمة المشاهد</h3>
                  <p className="mt-1">قم ببناء جدول يضم كافة مشاهد الرواية مشهداً بمشهد (حدد لكل مشهد: شخصية الـ POV، المكان، الزمان، وتفاصيل الحدث، وعدد الكلمات).</p>
                </div>
                
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100">الخطوة 9: سرد أحداث المشاهد</h3>
                  <p className="mt-1">اكتب ملخصاً سردياً مسودة لكل مشهد على حدة قبل البدء في كتابة فصول الرواية الفعلية.</p>
                </div>
                
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100">الخطوة 10: المسودة الأولى والتصدير</h3>
                  <p className="mt-1">اجمع كل أفكارك المنسقة واشرع في كتابة المسودة الكاملة، ثم قم بتصدير تفاصيل القصة لمتابعة المراجعة والتنقيح.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
