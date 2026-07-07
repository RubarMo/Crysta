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
    <div className="flex items-center gap-1.5 select-none font-cairo">
      <Sun className="w-3.5 h-3.5 text-m3-on-surface-variant transition-colors" />
      <button
        onClick={() => setIsDark(!isDark)}
        className={`w-9 h-5 rounded-full border flex items-center p-0.5 transition-colors cursor-pointer focus:outline-none ${
          isDark 
            ? 'bg-m3-primary border-transparent justify-end' 
            : 'bg-m3-surface-variant border-m3-outline justify-start'
        }`}
        role="switch"
        aria-checked={isDark}
        title={isDark ? "تفعيل الوضع المضيء" : "تفعيل الوضع المظلم"}
      >
        <span
          className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
            isDark ? 'bg-m3-on-primary' : 'bg-m3-outline'
          }`}
        />
      </button>
      <Moon className="w-3.5 h-3.5 text-m3-on-surface-variant transition-colors" />
    </div>
  );
};
