"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, ShoppingBag, TrendingUp, Zap } from "lucide-react";

export default function Hero() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollY } = useScroll();

    // Parallax effect for the background
    const y = useTransform(scrollY, [0, 1000], [0, 400]);
    const opacity = useTransform(scrollY, [0, 500], [1, 0.5]);

    return (
        <section
            ref={containerRef}
            className="relative h-screen min-h-[800px] w-full overflow-hidden bg-[#1a1a1a]"
        >
            {/* Background Video with Parallax */}
            <motion.div
                style={{ y, opacity, translateZ: 0, willChange: 'transform, opacity' }}
                className="absolute inset-0 w-full h-full gpu-accelerated"
            >
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80 z-10" />
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover object-center scale-105"
                >
                    <source src="/bannervideo/Video Project 6.mp4" type="video/mp4" />
                </video>
            </motion.div>

            {/* Content Container */}
            <div className="relative z-20 h-full container mx-auto px-6 flex flex-col justify-center items-center text-center text-white">

                {/* Brand Pill */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="mb-10 inline-flex items-center gap-3 px-6 py-2 rounded-full border border-white/30 bg-white/10 backdrop-blur-lg"
                >
                    <span className="w-2.5 h-2.5 rounded-full bg-peach animate-pulse" />
                    <span className="text-sm font-medium tracking-widest uppercase">Project Fashion v2.0</span>
                </motion.div>

                {/* Main Heading - LARGER */}
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="text-7xl md:text-8xl lg:text-[10rem] font-serif tracking-tight mb-8 leading-[0.9]"
                >
                    Where Fashion <br />
                    <span className="italic text-peach">Meets AI</span>
                </motion.h1>

                {/* Subheading - LARGER */}
                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                    className="text-xl md:text-2xl text-white/80 max-w-3xl mb-14 font-light leading-relaxed"
                >
                    The ultimate fashion marketplace connecting influencers with the hottest brands.
                    Try, Share, and Earn with vertically integrated AI.
                </motion.p>

                {/* Buttons - LARGER */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto"
                >
                    <Link href="/register">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-full sm:w-auto px-10 py-5 bg-white text-black rounded-full font-semibold text-base tracking-wide hover:bg-peach transition-colors flex items-center justify-center gap-3 group shadow-xl"
                        >
                            Get Started For Free
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </motion.button>
                    </Link>

                    <Link href="/login">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-full sm:w-auto px-10 py-5 bg-white/10 border border-white/30 text-white rounded-full font-semibold text-base tracking-wide hover:bg-white/20 transition-colors backdrop-blur-md"
                        >
                            Log In
                        </motion.button>
                    </Link>
                </motion.div>

                {/* Floating Stats / Features (Grid at bottom) */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                    className="absolute bottom-12 left-0 right-0 px-6 hidden md:flex justify-center gap-12 text-center"
                >
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-2">
                            <Zap className="w-5 h-5 text-peach" />
                        </div>
                        <span className="text-xl font-medium">Instant</span>
                        <span className="text-xs text-white/50 uppercase tracking-widest">Virtual Try-On</span>
                    </div>
                    <div className="w-px h-20 bg-gradient-to-b from-white/0 via-white/20 to-white/0" />
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-2">
                            <ShoppingBag className="w-5 h-5 text-peach" />
                        </div>
                        <span className="text-xl font-medium">Marketplace</span>
                        <span className="text-xs text-white/50 uppercase tracking-widest">Brand Connect</span>
                    </div>
                    <div className="w-px h-20 bg-gradient-to-b from-white/0 via-white/20 to-white/0" />
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-2">
                            <TrendingUp className="w-5 h-5 text-peach" />
                        </div>
                        <span className="text-xl font-medium">Analytics</span>
                        <span className="text-xs text-white/50 uppercase tracking-widest">Real-time Data</span>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

