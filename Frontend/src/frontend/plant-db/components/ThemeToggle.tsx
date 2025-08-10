"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";

export interface ThemeToggleProps {
    onToggle?: (isDark: boolean) => void;
}

export default function ThemeToggle({ onToggle }: ThemeToggleProps) {
    const [dark, setDark] = useState<boolean>(false);

    useEffect(() => {
        const saved = localStorage.getItem("theme");
        const isDark =
            saved === "dark" ||
            (!saved &&
                window.matchMedia("(prefers-color-scheme: dark)").matches);

        setDark(isDark);
        document.documentElement.classList.toggle("dark", isDark);
    }, []);

    const handleToggle = (next: boolean) => {
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem("theme", next ? "dark" : "light");
        onToggle?.(next);
    };

    return (
        <Switch
            checked={dark}
            onCheckedChange={handleToggle}
            aria-label="Toggle dark mode"
        />
    );
}
