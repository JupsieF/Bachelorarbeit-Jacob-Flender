"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<
    React.ElementRef<typeof SwitchPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
        className={cn(
            // base track styling
            "peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors",
            // light mode off-state track
            "bg-gray-200 border-gray-300",
            // focus ring
            "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand",
            // dark mode off-state track
            "dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-brand",
            // on-state track
            "data-[state=checked]:bg-brand data-[state=checked]:border-brand",
            className
        )}
        {...props}
        ref={ref}
    >
        <SwitchPrimitive.Thumb
            className={cn(
                // base thumb styling
                "pointer-events-none block h-5 w-5 rounded-full shadow-md ring-0 transition-transform",
                // light mode thumb
                "bg-white border border-gray-300",
                // dark mode thumb
                "dark:bg-gray-800 dark:border-gray-600",
                // thumb position
                "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
            )}
        />
    </SwitchPrimitive.Root>
));

Switch.displayName = SwitchPrimitive.Root.displayName;
