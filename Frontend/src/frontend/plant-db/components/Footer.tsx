"use client";

import Image from "next/image";
import basecomFlower from "@/assets/images/basecom-flower.svg";

export default function AddFooter() {
    return (
        <a
            href="https://perenual.com/plant-database-search-guide"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer transform transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
        >
            <Image
                src={basecomFlower}
                alt="basecom flower logo"
                width={24}
                height={24}
                className="inline-block align-middle"
            />
        </a>
    );
}
