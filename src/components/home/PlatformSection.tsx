"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, BarChart2, CheckCircle, ShoppingBag, Users } from "lucide-react";

export default function PlatformSection() {
    const [activeTab, setActiveTab] = useState<"brands" | "influencers">("influencers");

    return (
        <section className="py-24 md:py-32 bg-[#F9F8F4] border-t-[3px] border-black relative overflow-hidden">
            <div className="mx-auto max-w-7xl px-6 md:px-8">
                <div className="text-center mb-14">
                    <span className="text-sm font-bold uppercase tracking-widest text-[#FF8C69]">
                        Our Platform
                    </span>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-black mt-2 mb-8 tracking-tighter">
                        Everything We Give You
                    </h2>

                    {/* Neo brutal toggle */}
                    <div className="inline-flex items-center p-1.5 bg-white border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <button
                            onClick={() => setActiveTab("brands")}
                            className={`px-6 py-3 rounded-lg text-sm font-bold transition-all ${
                                activeTab === "brands"
                                    ? "bg-black text-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]"
                                    : "text-black hover:bg-black/5"
                            }`}
                        >
                            For Brands
                        </button>
                        <button
                            onClick={() => setActiveTab("influencers")}
                            className={`px-6 py-3 rounded-lg text-sm font-bold transition-all ${
                                activeTab === "influencers"
                                    ? "bg-black text-white shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]"
                                    : "text-black hover:bg-black/5"
                            }`}
                        >
                            For Influencers
                        </button>
                    </div>
                </div>

                <div className="bg-white border-[3px] border-black rounded-xl p-8 md:p-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                            className="grid md:grid-cols-2 gap-12 items-center"
                        >
                            <div className="space-y-6">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F9F8F4] rounded-xl border-[3px] border-black font-bold text-sm uppercase tracking-wide">
                                    {activeTab === "brands" ? (
                                        <ShoppingBag className="w-4 h-4" />
                                    ) : (
                                        <Users className="w-4 h-4" />
                                    )}
                                    {activeTab === "brands" ? "For Brands" : "For Influencers"}
                                </div>

                                <h3 className="text-3xl md:text-4xl font-black text-black leading-tight tracking-tight">
                                    {activeTab === "brands"
                                        ? "Reach Gen-Z Authentically"
                                        : "Turn Your Influence Into Income"}
                                </h3>

                                <p className="text-lg text-black/80 leading-relaxed font-medium">
                                    {activeTab === "brands"
                                        ? "Connect with verified influencers, launch campaigns, and track performance with our analytics suite."
                                        : "Join creators earning through AI Try-Ons, branded collaborations, and high-commission affiliate links."}
                                </p>

                                <div className="space-y-3">
                                    {(activeTab === "brands"
                                        ? [
                                            "Access Thousands Of Verified Gen-Z Influencers",
                                            "AI-Powered Content Moderation And Brand Protection",
                                            "Real-Time Insights And Performance Tracking",
                                        ]
                                        : [
                                            "AI Virtual Try-On Without Ordering Physical Items",
                                            "Earn Up To 10% – 30% Per Sale",
                                            "Share Directly To Your Social Feeds",
                                        ]
                                    ).map((item, i) => (
                                        <motion.div
                                            key={item}
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 + i * 0.05 }}
                                            className="flex items-center gap-4 p-4 bg-[#F9F8F4] rounded-xl border-[3px] border-black font-medium text-black"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-[#FF8C69] border-[2px] border-black flex items-center justify-center flex-shrink-0">
                                                <CheckCircle className="w-4 h-4 text-black" />
                                            </div>
                                            {item}
                                        </motion.div>
                                    ))}
                                </div>

                                <Link
                                    href={
                                        activeTab === "brands"
                                            ? "/register?role=brand"
                                            : "/register?role=influencer"
                                    }
                                    className="inline-flex items-center gap-2 mt-4 px-6 py-4 bg-[#B4F056] text-black font-bold border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                                >
                                    {activeTab === "brands" ? "Join as Brand" : "Join as Influencer"}
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>

                            <div className="relative h-[400px] md:h-[500px] w-full bg-black rounded-xl border-[3px] border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <img
                                    src={
                                        activeTab === "brands"
                                            ? "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2000&auto=format&fit=crop"
                                            : "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=2000&auto=format&fit=crop"
                                    }
                                    alt="Platform"
                                    className="w-full h-full object-cover opacity-90"
                                    loading="lazy"
                                    decoding="async"
                                />
                                <div className="absolute bottom-6 left-6 right-6 p-4 bg-white/95 border-[3px] border-black rounded-xl">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="h-3 w-24 bg-black/20 rounded-full" />
                                        <BarChart2 className="w-5 h-5 text-[#FF8C69]" />
                                    </div>
                                    <div className="h-16 w-full flex items-end gap-1">
                                        {[40, 70, 50, 90, 60, 80, 50].map((h, i) => (
                                            <div
                                                key={i}
                                                className="flex-1 bg-[#FF8C69] border-2 border-black rounded-t"
                                                style={{ height: `${h}%` }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
}
