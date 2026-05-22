'use client'

import Link from "next/link";
import { useUser } from "@/lib/react-query/hooks";

export default function Footer() {
    const { data: user, isLoading } = useUser();
    const isLoggedIn = !!user && !isLoading;
    const role = typeof user?.role === 'string' ? user.role.toLowerCase() : null;
    const showBrandFeatureLinks = isLoading ? false : !isLoggedIn || role === 'brand';

    return (
        <footer className="border-t-[3px] border-black bg-[var(--brutal-cream)] py-10 sm:py-14">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-[1.2fr_0.9fr_0.9fr_0.9fr] lg:gap-10">
                    <div className="space-y-4 pr-0 lg:pr-6">
                        <h3 className="kiwikoo-wordmark text-[1.8rem] font-black leading-none text-black">Kiwikoo</h3>
                        <p className="max-w-sm text-sm font-bold leading-relaxed text-black/70">
                            AI-powered fashion try-on discovery platform connecting influencers and brands.
                        </p>
                    </div>

                    <div>
                        <h4 className="mb-4 text-xs font-black uppercase tracking-wider text-black">
                            Company
                        </h4>
                        <ul className="space-y-2 text-sm font-bold text-black/70">
                            <li>
                                <Link href="/about" className="hover:text-black hover:underline">
                                    About Us
                                </Link>
                            </li>
                            {!isLoggedIn && (
                                <li>
                                    <Link href="/register" className="hover:text-black hover:underline">
                                        Join Us
                                    </Link>
                                </li>
                            )}
                            <li>
                                <Link 
                                    href={user?.role === 'BRAND' ? '/brand/campaigns' : '/marketplace'} 
                                    className="hover:text-black hover:underline"
                                >
                                    {user?.role === 'BRAND' ? 'Campaign' : 'Discovery'}
                                </Link>
                            </li>
                            {!isLoggedIn && (
                                <li>
                                    <Link href="/login" className="hover:text-black hover:underline">
                                        Sign In
                                    </Link>
                                </li>
                            )}
                            <li>
                                <Link href="/help" className="hover:text-black hover:underline">
                                    Help & Support
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="mb-4 text-xs font-black uppercase tracking-wider text-black">
                            Features
                        </h4>
                        <ul className="space-y-2 text-sm font-bold text-black/70">
                            <li>
                                <Link href="/influencer/try-on" className="hover:text-black hover:underline">
                                    Virtual Try-On
                                </Link>
                            </li>
                            {showBrandFeatureLinks && (
                                <>
                                    <li>
                                        <Link href="/brand/ads" className="hover:text-black hover:underline">
                                            Ad Generation
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/brand/campaigns" className="hover:text-black hover:underline">
                                            Campaigns
                                        </Link>
                                    </li>
                                </>
                            )}
                            <li>
                                <Link href="/influencer/dashboard" className="hover:text-black hover:underline">
                                    Dashboard
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="mb-4 text-xs font-black uppercase tracking-wider text-black">
                            Legal
                        </h4>
                        <ul className="space-y-2 text-sm font-bold text-black/70">
                            <li>
                                <Link href="/privacy" className="hover:text-black hover:underline">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="hover:text-black hover:underline">
                                    Terms of Use
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="hover:text-black hover:underline">
                                    Contact Us
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t-[3px] border-black/90 pt-5 text-xs font-bold text-black/60 sm:mt-12 sm:items-center sm:gap-4 md:flex-row">
                    <p>&copy; 2026 Kiwikoo. All rights reserved.</p>
                    <div className="flex gap-4">
                        <span>English (US)</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
