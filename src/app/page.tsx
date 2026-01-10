'use client'
import Navbar from "@/components/NavBar";
import { useTheme } from "next-themes";
import Image from "next/image";

export default function Home() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex flex-col min-h-screen items-center justify-center">
      <Navbar />
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          {/* <div className="flex flex-row justify-center items-center">
            <Image src="/favicon.ico" alt="logo" width={100} height={20} />
            <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight">
              ColabSync
            </h1>
          </div> */}
          <p 
          className={
            theme === "dark"
              ? "max-w-md text-lg leading-8 text-gray-400 cursor-pointer"
              : "max-w-md text-lg leading-8 text-gray-500 cursor-pointer"
            } 
            >
            Bring every aspect of your workplace together — tasks, teams, and
            hiring. Give employees and managers the tools they need to stay
            productive and aligned. Monitor activity and measure performance
            through a powerful analytics dashboard.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row"></div>
      </main>
    </div>
  );
}
