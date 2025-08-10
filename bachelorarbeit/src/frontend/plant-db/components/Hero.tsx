"use client";

import React from "react";

export default function AddHeroSection() {
    return (
        <section className="w-full bg-brand/10 dark:bg-[color:var(--color-brand)/0.2] py-12 mb-8 rounded-xl">
            <div className="mx-auto max-w-4xl text-center">
                <h1 className="text-4xl font-bold mb-4">
                    basecom Pflanzen-Datenbank
                </h1>
                <p className="text-lg text-gray-700 dark:text-gray-300">
                    Hier pflegst du die Pflanzen-Sammlung, fragst alle
                    vorhandenen Pflanzen ab oder löscht sie aus der Datenbank.
                </p>
            </div>
        </section>
    );
}
