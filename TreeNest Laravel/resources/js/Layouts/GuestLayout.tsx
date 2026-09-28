import { Link } from '@inertiajs/react';
import { PropsWithChildren, useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function Guest({ children }: PropsWithChildren) {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const isCurrentDark = document.documentElement.classList.contains('dark') ||
            localStorage.getItem('theme') === 'dark';
        setIsDark(isCurrentDark);
        if (isCurrentDark) {
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleTheme = () => {
        const next = !isDark;
        setIsDark(next);
        if (next) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col justify-between p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-emerald-100/50 dark:from-neutral-950 dark:via-neutral-900 dark:to-emerald-950/20 text-neutral-800 dark:text-neutral-100 font-sans transition-colors duration-300">
            {/* Top Left: TreeNest Logo */}
            <div className="fixed top-4 left-4 sm:top-6 sm:left-7 z-20 select-none">
                <Link href="/" className="text-2xl sm:text-[30px] font-extrabold font-mono tracking-wider leading-none">
                    <span className="text-emerald-700 dark:text-emerald-400">Tree</span>
                    <span className="text-neutral-900 dark:text-white">Nest</span>
                </Link>
            </div>

            {/* Top Right: Slogan */}
            <div className="fixed top-4 right-4 sm:top-6 sm:right-7 z-20 flex items-center gap-2 select-none">
                <span className="text-xs sm:text-[13px] font-medium text-neutral-500 dark:text-neutral-400 tracking-tight hidden sm:inline">
                    Bersama tumbuh, lebih baik.
                </span>
            </div>

            {/* Center Card */}
            <div className="flex-1 w-full flex items-center justify-center z-10 py-6">
                <div className="relative w-full max-w-[460px]">
                    <div className="w-full rounded-2xl bg-white/95 dark:bg-neutral-900/95 border border-emerald-100/80 dark:border-neutral-800 shadow-xl p-7 sm:p-9 text-neutral-800 dark:text-white backdrop-blur-md transition-shadow">
                        {children}
                    </div>

                    {/* Theme Toggle Button */}
                    <div className="absolute -right-3.5 sm:left-[calc(100%+14px)] sm:right-auto top-1/2 -translate-y-1/2 z-30 select-none">
                        <button
                            type="button"
                            onClick={toggleTheme}
                            title={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
                            className="flex items-center justify-center size-9 sm:size-10 rounded-xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-white shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                        >
                            {isDark ? (
                                <Sun className="size-4 sm:size-[18px] text-amber-400 fill-amber-400/20" />
                            ) : (
                                <Moon className="size-4 sm:size-[18px] text-slate-700 fill-slate-700/20" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="w-full flex items-center justify-between text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 select-none pt-2">
                <div className="flex items-center gap-2">
                    <span className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer">Kebijakan Privasi</span>
                    <span>|</span>
                    <span className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer">Syarat & Ketentuan</span>
                    <span>|</span>
                    <span className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer">Bantuan</span>
                </div>
                <div>TreeNest © {new Date().getFullYear()}</div>
            </div>
        </div>
    );
}
