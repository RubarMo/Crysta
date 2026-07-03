import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <div className="flex items-center gap-1.5 select-none">
      <Sun className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-650 transition-colors" />
      <button
        onClick={() => setIsDark(!isDark)}
        className="w-8 h-4.5 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 relative transition-colors cursor-pointer focus:outline-none"
        role="switch"
        aria-checked={isDark}
        title={isDark ? "تفعيل الوضع المضيء" : "تفعيل الوضع المظلم"}
      >
        <span
          className={`absolute top-0.5 bottom-0.5 w-3 h-3 rounded-full bg-zinc-500 dark:bg-zinc-350 transition-all duration-200 ${
            isDark ? 'right-4' : 'right-0.5'
          }`}
        />
      </button>
      <Moon className="w-3 h-3 text-zinc-650 dark:text-zinc-400 transition-colors" />
    </div>
  );
};
