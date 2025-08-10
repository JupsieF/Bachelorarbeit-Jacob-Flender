import type { ReactNode } from "react";

export default function LoginLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col">
            <main className="flex-1 flex items-center justify-center mx-auto max-w-4xl px-4">
                {children}
            </main>
        </div>
    );
}
