"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";

export default function AnimatedThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <div className="flex items-center gap-3">
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="moon"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Moon className="w-5 h-5 text-white" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Sun className="w-5 h-5 text-black" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        {/* Switch background */}
        <Switch
          checked={isDark}
          onCheckedChange={() => setTheme(isDark ? "light" : "dark")}
          className="
            h-6 w-12 rounded-full transition-colors duration-300
            /* Prevent default shadcn gray background */
          data-[state=unchecked]:bg-black dark:bg-white 
          " 
        />

        {/* Animated Circle (Thumb) */}
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="
            absolute top-[3px] left-[3px]
            h-[18px] w-[18px] rounded-full shadow-md pointer-events-none
          "
          animate={{
            x: isDark ? 24 : 0,
            backgroundColor: isDark ? "#000000" : "#FFFFFF", // 🔥 Circle color opposite
          }}
        />
      </div>
    </div>
  );
}
