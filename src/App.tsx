import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Workspace } from "./components/Workspace";
import { ThemeToggle } from "./components/ThemeToggle";
import { Novel, StepProgress, getNovels, createNovel, deleteNovel, getStepsProgress } from "./lib";
import { BookOpen } from "lucide-react";

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
            <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto space-y-4">
              <BookOpen className="w-10 h-10 text-zinc-300 dark:text-zinc-800 stroke-[1.2]" />
              <h2 className="text-md font-bold text-zinc-800 dark:text-zinc-100 font-cairo">مرحباً بك في أداة Snowflake</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-cairo">
                تعتمد هذه الأداة على طريقة سنوفليك (Snowflake Method) لبناء الروايات خطوة بخطوة من الفكرة البسيطة إلى الهيكل المتكامل.
              </p>
              <button
                onClick={handleCreateNovel}
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#181818] hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs font-bold transition-all duration-150 rounded"
              >
                إنشاء رواية جديدة للبدء
              </button>
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
