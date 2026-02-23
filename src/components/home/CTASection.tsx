"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
    return (
        <section className="py-24 md:py-32 bg-black border-t-[3px] border-black relative overflow-hidden text-center">
            {/* Static gradient glow - no animation to avoid scroll lag */}
            <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    background: "radial-gradient(ellipse 80% 50% at 50% 50%, #FF8C69 0%, transparent 50%)",
                }}
            />
            <div className="mx-auto max-w-3xl px-6 md:px-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    viewport={{ once: true, amount: 0.2 }}
                >
                    <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white mb-6 tracking-tighter">
                        Ready to Transform <br />
                        <span className="italic text-[#FF8C69]">Fashion?</span>
                    </h2>

                    <p className="text-lg md:text-xl text-white/80 mb-10 font-medium max-w-xl mx-auto">
                        Join the future of fashion marketing. Whether you&apos;re a creator or a brand,
                        Gen-Z fashion is your gateway to success.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/register">
                            <motion.span
                                whileHover={{ scale: 1.03, boxShadow: "0 0 24px rgba(180,240,86,0.4)" }}
                                whileTap={{ scale: 0.98 }}
                                className="inline-flex items-center justify-center gap-2 min-w-[200px] px-8 py-4 bg-[#B4F056] text-black font-bold border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(180,240,86,0.5)] transition-all"
                            >
                                Create Account
                                <ArrowRight className="w-5 h-5" />
                            </motion.span>
                        </Link>
                        <Link href="/about">
                            <motion.span
                                whileHover={{ scale: 1.03, boxShadow: "0 0 24px rgba(255,255,255,0.2)" }}
                                whileTap={{ scale: 0.98 }}
                                className="inline-flex items-center justify-center min-w-[200px] px-8 py-4 bg-white text-black font-bold border-[3px] border-white rounded-xl shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] hover:bg-[#F9F8F4] transition-all"
                            >
                                Learn More
                            </motion.span>
                        </Link>
                    </div>

                    <p className="mt-10 text-sm text-white/50 font-medium">
                        No credit card required for creators. 14-day free trial for brands.
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
