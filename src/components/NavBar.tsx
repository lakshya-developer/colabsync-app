"use client";

import { useTheme } from "next-themes";
import Image from "next/image";
import AnimatedThemeSwitch from "./AnimatedThemeSwitch";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  return (
    <nav className="w-full flex items-center justify-between px-6  shadow">
      {/* Left: Logo */}
      <a href="/">
        <Image
          className="cursor-pointer"
          src="/logo.png"
          alt="logo"
          width={150}
          height={20}
        />
      </a>

      {/* Center: Navigation Items */}
      <div className="flex gap-8 text-lg font-medium">
        <a
          href="/"
          className={
            theme === "dark"
              ? "text-gray-400 hover:text-white"
              : "text-gray-500 hover:text-black"
          }
        >
          Home
        </a>
        <a
          href="/sign-up"
          className={
            theme === "dark"
              ? "text-gray-500 hover:text-white"
              : "text-gray-500 hover:text-black"
          }
        >
          Sign Up
        </a>
        <a
          href="/sign-in"
          className={
            theme === "dark"
              ? "text-gray-500 hover:text-white"
              : "text-gray-500 hover:text-black"
          }
        >
          Sign In
        </a>
      </div>

      <AnimatedThemeSwitch />
    </nav>
  );
}
