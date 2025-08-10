"use client";

import Image from "next/image";
import basecomLogoUrl from "@/assets/images/basecom-logo.svg";
import basecomWhiteLogoUrl from "@/assets/images/basecom-white-logo.svg";
import ThemeToggle from "@/components/ThemeToggle";
import { useState, useEffect } from "react";

export default function AddHeader() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("theme");
        const preferDark =
            saved === "dark" ||
            (!saved &&
                window.matchMedia("(prefers-color-scheme: dark)").matches);
        setIsDark(preferDark);
    }, []);

    const reload = () => window.location.reload();

    return (
        <div className="flex w-full items-center justify-between">
            <button
                onClick={reload}
                className="cursor-pointer transform transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
            >
                <Image
                    src={isDark ? basecomWhiteLogoUrl : basecomLogoUrl}
                    alt="basecom logo"
                    width={300}
                    height={100}
                />
            </button>
            <ThemeToggle onToggle={setIsDark} />
        </div>
    );
}
