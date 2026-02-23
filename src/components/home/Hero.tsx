"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ShoppingBag, TrendingUp, Zap } from "lucide-react";

export default function Hero() {
    return (
        <section className="relative w-full overflow-hidden bg-[#F9F8F4] border-b-[3px] border-black min-h-[85vh] flex flex-col justify-center">
            {/* Dot grid background */}
            <div
                className="absolute inset-0 opacity-[0.4]"
                style={{
                    backgroundImage: `radial-gradient(#1F1D1A 1px, transparent 1px)`,
                    backgroundSize: "24px 24px",
                }}
            />
            {/* Vibrant orbs - subtle motion */}
            <motion.div
                className="absolute top-1/4 right-0 w-[400px] h-[400px] rounded-full opacity-30 pointer-events-none"
                style={{ background: "radial-gradient(circle, #FF8C69 0%, transparent 70%)" }}
                animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute bottom-1/4 left-0 w-[350px] h-[350px] rounded-full opacity-30 pointer-events-none"
                style={{ background: "radial-gradient(circle, #B4F056 0%, transparent 70%)" }}
                animate={{ x: [0, -20, 0], y: [0, 25, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-8 py-20 md:py-28 text-center">
                {/* Brand pill - neo brutal */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="mb-8 inline-flex items-center gap-3 px-5 py-2 rounded-xl border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF8C69]" />
                    <span className="text-sm font-bold tracking-widest uppercase text-black">
                        Kiwikoo · Production
                    </span>
                </motion.div>

                {/* Main heading */}
                <motion.h1
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter text-black mb-6 leading-[0.95]"
                >
                    Where Fashion <br />
                    <span className="italic text-[#FF8C69]">Meets AI</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.25 }}
                    className="text-lg md:text-xl text-black/80 max-w-2xl mx-auto mb-12 font-medium leading-relaxed"
                >
                    The ultimate fashion marketplace connecting influencers with the hottest brands.
                    Try, Share, and Earn with vertically integrated AI.
                </motion.p>

                {/* CTAs - neo brutal buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.35 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                >
                    <Link href="/register">
                        <motion.span
                            whileHover={{ translateY: -2 }}
                            whileTap={{ translateY: 2 }}
                            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-[#B4F056] text-black font-bold border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                        >
                            Get Started For Free
                            <ArrowRight className="w-5 h-5" />
                        </motion.span>
                    </Link>
                    <Link href="/login">
                        <motion.span
                            whileHover={{ translateY: -2 }}
                            whileTap={{ translateY: 2 }}
                            className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-white text-black font-bold border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                        >
                            Log In
                        </motion.span>
                    </Link>
                </motion.div>

                {/* Stats row - brutal cards */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="mt-16 hidden md:flex justify-center gap-6 flex-wrap"
                >
                    {[
                        { icon: Zap, label: "Instant", sub: "Virtual Try-On" },
                        { icon: ShoppingBag, label: "Marketplace", sub: "Brand Connect" },
                        { icon: TrendingUp, label: "Analytics", sub: "Real-time Data" },
                    ].map((item) => (
                        <div
                            key={item.sub}
                            className="flex flex-col items-center gap-2 px-6 py-4 bg-white border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        >
                            <div className="w-12 h-12 rounded-xl border-[3px] border-black bg-[#F9F8F4] flex items-center justify-center">
                                <item.icon className="w-5 h-5 text-[#FF8C69]" />
                            </div>
                            <span className="text-lg font-bold text-black">{item.label}</span>
                            <span className="text-xs font-medium text-black/60 uppercase tracking-wider">
                                {item.sub}
                            </span>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
