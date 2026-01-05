"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
    return (
        <section className="py-32 bg-[#1a1a1a] relative overflow-hidden text-center">
            {/* Background Gradients */}
            <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-peach/10 blur-[150px] rounded-full -translate-y-1/2" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 blur-[150px] rounded-full" />

            <div className="container mx-auto px-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-5xl md:text-7xl font-serif text-white mb-8 tracking-tight">
                        Ready to Transform <br />
                        <span className="italic text-peach">Fashion?</span>
                    </h2>

                    <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto font-light">
                        Join the future of fashion marketing. Whether you're a creator or a brand,
                        Gen-Z fashion is your gateway to success.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-6 justify-center">
                        <Link href="/register">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-10 py-5 bg-white text-[#1a1a1a] rounded-full font-medium text-lg min-w-[200px] hover:bg-peach transition-colors"
                            >
                                Create Account
                            </motion.button>
                        </Link>

                        <Link href="/about">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-10 py-5 border border-white/20 text-white rounded-full font-medium text-lg min-w-[200px] hover:bg-white/10 transition-colors"
                            >
                                Learn More
                            </motion.button>
                        </Link>
                    </div>

                    <p className="mt-12 text-sm text-white/30">
                        No credit card required for creators. 14-day free trial for brands.
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
