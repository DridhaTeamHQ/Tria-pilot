"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Heart, Shield, Zap } from "lucide-react";

const values = [
    {
        id: "identity",
        title: "Creator Identity",
        icon: Heart,
        description: "Your Style Is Not Data. Your Creativity Is Not A Variable.",
        detail:
            "We believe every creator has a unique identity. Our AI supports and amplifies your individuality — we help you present your style more clearly and consistently.",
        accent: "bg-[#FF8C69]",
    },
    {
        id: "privacy",
        title: "Privacy & Ownership",
        icon: Shield,
        description: "Trust Is Non-Negotiable.",
        detail:
            "Your data is secure, private, and fully owned by you. We don't sell it or use it without consent.",
        accent: "bg-[#B4F056]",
    },
    {
        id: "speed",
        title: "Speed & Simplicity",
        icon: Zap,
        description: "Great Tools Should Disappear Into The Workflow.",
        detail:
            "Fast, intuitive, and effortless. No cluttered dashboards. Whether discovering products or tracking performance — smooth and friction-free.",
        accent: "bg-[#FF8C69]",
    },
    {
        id: "monetization",
        title: "Fair Monetization",
        icon: DollarSign,
        description: "Creators Deserve Clarity And Fairness.",
        detail:
            "Transparent, trackable, and honest. Every click and collaboration clearly visible — no hidden logic or confusing payouts.",
        accent: "bg-[#B4F056]",
    },
];

export default function ValuesSection() {
    const [activeValue, setActiveValue] = useState(values[0]);

    return (
        <section className="py-24 md:py-32 bg-white border-t-[3px] border-black overflow-hidden">
            <div className="mx-auto max-w-7xl px-6 md:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-14"
                >
                    <span className="text-sm font-bold uppercase tracking-widest text-[#FF8C69]">
                        Our Values
                    </span>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-black mt-2 tracking-tighter">
                        What We Stand For
                    </h2>
                    <p className="text-lg text-black/70 mt-4 max-w-xl font-medium">
                        The principles that guide how we build fashion technology.
                    </p>
                </motion.div>

                <div className="flex flex-col lg:flex-row gap-10 lg:gap-12 items-start">
                    <div className="w-full lg:w-1/3 flex flex-col gap-3">
                        {values.map((value) => (
                            <motion.button
                                key={value.id}
                                onClick={() => setActiveValue(value)}
                                className={`flex items-center gap-4 text-left p-4 rounded-xl border-[3px] border-black font-bold transition-all text-lg ${
                                    activeValue.id === value.id
                                        ? "bg-black text-white shadow-[4px_4px_0px_0px_rgba(255,140,105,1)]"
                                        : "bg-[#F9F8F4] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                                }`}
                            >
                                <div
                                    className={`p-2.5 rounded-lg ${value.accent} ${
                                        activeValue.id === value.id ? "text-black" : "text-black"
                                    }`}
                                >
                                    <value.icon className="w-5 h-5" />
                                </div>
                                {value.title}
                            </motion.button>
                        ))}
                    </div>

                    <div className="w-full lg:w-2/3">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeValue.id}
                                initial={{ opacity: 0, x: 16 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -16 }}
                                transition={{ duration: 0.3 }}
                                className="bg-[#F9F8F4] border-[3px] border-black rounded-xl p-8 md:p-12 min-h-[320px] flex flex-col justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                            >
                                <div
                                    className={`w-14 h-14 rounded-xl ${activeValue.accent} flex items-center justify-center mb-6 border-[3px] border-black`}
                                >
                                    <activeValue.icon className="w-7 h-7 text-black" />
                                </div>
                                <h3 className="text-2xl md:text-3xl font-black text-black mb-4 tracking-tight">
                                    {activeValue.title}
                                </h3>
                                <p className="text-lg font-bold text-black/90 mb-4 italic">
                                    {activeValue.description}
                                </p>
                                <p className="text-black/70 leading-relaxed font-medium">
                                    {activeValue.detail}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
}
