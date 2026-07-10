import React, { useEffect, useState } from 'react';

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
    <div className="flex items-center gap-2 select-none font-cairo">
      <span className="material-symbols-rounded text-xs text-m3-on-surface-variant">light_mode</span>
      <md-switch
        selected={isDark}
        checked={isDark}
        onChange={() => setIsDark(!isDark)}
        title={isDark ? "تفعيل الوضع المضيء" : "تفعيل الوضع المظلم"}
        className="cursor-pointer scale-75"
      />
      <span className="material-symbols-rounded text-xs text-m3-on-surface-variant">dark_mode</span>
    </div>
  );
};
