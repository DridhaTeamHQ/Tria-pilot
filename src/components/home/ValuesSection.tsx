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
        detail: "We believe every creator has a unique identity — in the way they dress, express, and influence. Our AI is designed to support and amplify your individuality, never overwrite it. We don't reshape faces, alter bodies, or force trends. instead, we help creators present their style more clearly, confidently, and consistently.",
        color: "bg-orange-50 text-orange-600"
    },
    {
        id: "privacy",
        title: "Privacy & Ownership",
        icon: Shield,
        description: "Trust Is Non-Negotiable.",
        detail: "Creators and brands trust us with sensitive data — content performance, audience insights, and social integrations. We take that responsibility seriously. Your data is secure, private, and fully owned by you. We don't sell it. We don't exploit it. We don't use it without consent.",
        color: "bg-blue-50 text-blue-600"
    },
    {
        id: "speed",
        title: "Speed & Simplicity",
        icon: Zap,
        description: "Great Tools Should Disappear Into The Workflow.",
        detail: "We design everything to be fast, intuitive, and effortless. no cluttered dashboards. no unnecessary steps. whether you're discovering products, creating content, or tracking performance, the experience should feel smooth and friction-free.",
        color: "bg-purple-50 text-purple-600"
    },
    {
        id: "monetization",
        title: "Fair Monetization",
        icon: DollarSign,
        description: "Creators Deserve Clarity And Fairness.",
        detail: "We believe monetization should be transparent, trackable, and honest. every click, conversion, and collaboration should be clearly visible — with no hidden logic or confusing payouts. our platform is built to ensure creators and brands both understand where value is created and how revenue flows.",
        color: "bg-green-50 text-green-600"
    }
];

export default function ValuesSection() {
    const [activeValue, setActiveValue] = useState(values[0]);

    return (
        <section className="py-24 bg-white overflow-hidden">
            <div className="container mx-auto px-6">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-16"
                >
                    <span className="text-peach font-semibold tracking-wider text-sm uppercase">Our Values</span>
                    <h2 className="text-5xl md:text-6xl font-serif text-charcoal mt-3">
                        What We Stand For
                    </h2>
                    <p className="text-lg text-charcoal/60 mt-4 max-w-xl">
                        The principles that guide how we build fashion technology.
                    </p>
                </motion.div>

                <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-start">

                    {/* Left: Navigation List */}
                    <div className="w-full lg:w-1/3 flex flex-col gap-6">
                        {values.map((value) => (
                            <motion.button
                                key={value.id}
                                onClick={() => setActiveValue(value)}
                                whileHover={{ x: 10 }}
                                className={`flex items-center gap-4 text-left p-4 rounded-2xl transition-all duration-300 group ${activeValue.id === value.id
                                        ? "bg-white shadow-lg border border-charcoal/5"
                                        : "hover:bg-cream/50"
                                    }`}
                            >
                                <div className={`p-3 rounded-xl ${value.color} ${activeValue.id === value.id ? 'opacity-100' : 'opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100'} transition-all`}>
                                    <value.icon className="w-6 h-6" />
                                </div>
                                <span className={`text-xl font-serif ${activeValue.id === value.id ? 'text-charcoal' : 'text-charcoal/40 group-hover:text-charcoal'}`}>
                                    {value.title}
                                </span>
                            </motion.button>
                        ))}
                    </div>

                    {/* Right: Detail Card */}
                    <div className="w-full lg:w-2/3">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeValue.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.4 }}
                                className="bg-cream/30 border border-charcoal/5 rounded-[3rem] p-10 md:p-16 h-full min-h-[400px] flex flex-col justify-center shadow-sm"
                            >
                                <div className={`w-16 h-16 rounded-2xl ${activeValue.color} flex items-center justify-center mb-8`}>
                                    <activeValue.icon className="w-8 h-8" />
                                </div>
                                <h3 className="text-3xl md:text-4xl font-serif text-charcoal mb-6">
                                    {activeValue.title}
                                </h3>
                                <h4 className="text-lg font-medium text-charcoal/80 mb-4 italic">
                                    {activeValue.description}
                                </h4>
                                <p className="text-charcoal/60 leading-relaxed text-lg font-light">
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
