"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Menu,
    X,
    LogOut,
    Sparkles,
    Camera,
    ShoppingBag,
    LayoutDashboard,
    Mail,
    User,
    Box,
    Megaphone,
    BarChart3,
    ChevronRight,
} from "lucide-react";
import { useUser } from "@/lib/react-query/hooks";
import { useQueryClient } from "@tanstack/react-query";

export default function BrutalNavbar() {
    const pathname = usePathname();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { data: user, isLoading } = useUser();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Hide on auth/utility pages, admin routes, onboarding, and pending approval
    const isAuthPage =
        pathname?.startsWith("/login") ||
        pathname?.startsWith("/register") ||
        pathname?.startsWith("/signup") ||
        pathname?.startsWith("/forgot-password") ||
        pathname?.startsWith("/reset-password") ||
        pathname?.startsWith("/auth/confirm") ||
        pathname?.startsWith("/complete-profile") ||
        pathname?.startsWith("/onboarding") ||
        pathname?.startsWith("/influencer/pending") ||
        pathname?.startsWith("/admin");

    const handleLogout = useCallback(async () => {
        try {
            queryClient.setQueryData(["user"], null);
            queryClient.invalidateQueries({ queryKey: ["user"] });
            queryClient.removeQueries({ queryKey: ["user"] });
            queryClient.clear();

            await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });

            if (typeof window !== "undefined") {
                localStorage.clear();
                sessionStorage.clear();
            }

            window.location.href = "/login";
        } catch (error) {
            console.error("Logout error:", error);
            window.location.href = "/login";
        }
    }, [queryClient]);

    const isActive = (path: string) =>
        pathname === path || pathname?.startsWith(path + "/");
    const isLoggedIn = !isLoading && user !== null && user !== undefined;

    if (isAuthPage) {
        return null;
    }

    // Navigation links based on auth state and role
    const influencerLinks = [
        { href: "/inbox", label: "Inbox", icon: Mail },
        { href: "/profile", label: "Profile", icon: User },
        { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
        { href: "/influencer/try-on", label: "Try-On Studio", icon: Camera },
        { href: "/influencer/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/influencer/analytics", label: "Analytics", icon: BarChart3 },
    ];

    const brandLinks = [
        { href: "/brand/campaigns", label: "Campaigns", icon: Megaphone },
        { href: "/profile", label: "Profile", icon: User },
        { href: "/brand/marketplace", label: "Influencers", icon: ShoppingBag },
        { href: "/brand/ads", label: "Ads", icon: Sparkles },
        { href: "/brand/products", label: "Products", icon: Box },
        { href: "/inbox", label: "Inbox", icon: Mail },
    ];

    // Public links for logged-out users (matching user request)
    const publicLinks = [
        { href: "/influencer/try-on", label: "Try-On" },
        { href: "/register?role=influencer", label: "For Influencers" },
        { href: "/register?role=brand", label: "For Brands" },
    ];

    let links: typeof influencerLinks | typeof brandLinks = [];
    if (isLoggedIn && user) {
        if (user.role === "BRAND") {
            links = brandLinks;
        } else if (user.role === "INFLUENCER") {
            links = influencerLinks;
        }
    }

    const userInitial =
        isLoggedIn && user
            ? user.name?.charAt(0).toUpperCase() ||
            user.email?.charAt(0).toUpperCase() ||
            "U"
            : "U";

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#F9F8F4] border-b-[3px] border-black">
            <div className="container mx-auto px-6">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <Link
                        href="/"
                        prefetch={true}
                        className="text-3xl font-black tracking-tight text-black hover:text-[#FF8C69] transition-colors"
                    >
                        Kiwikoo
                    </Link>

                    {/* Desktop Navigation - Center */}
                    {isLoggedIn ? (
                        <nav className="hidden md:flex items-center gap-2">
                            {links.map((link) => {
                                const Icon = link.icon;
                                const active = isActive(link.href);
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        prefetch={true}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150 flex items-center gap-2 border-2 border-black ${active
                                            ? "bg-[#FF8C69] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                            : "bg-white text-black hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    ) : (
                        <nav className="hidden md:flex items-center gap-6 text-base font-bold text-black">
                            {publicLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="hover:text-[#FF8C69] transition-colors flex items-center gap-1"
                                >
                                    {link.label}
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            ))}
                        </nav>
                    )}

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-4">
                        {isLoggedIn ? (
                            <div className="hidden md:flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#B4F056] border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-black font-black">
                                    {userInitial}
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-black border-2 border-black rounded-xl bg-white hover:bg-red-100 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <div className="hidden md:flex items-center gap-3">
                                {/* Log In - Outlined */}
                                <Link
                                    href="/login"
                                    prefetch={true}
                                    className="px-6 py-3 text-base font-bold text-black bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-1"
                                >
                                    Log In
                                    <ChevronRight className="w-5 h-5" />
                                </Link>
                                {/* Get Started - Filled */}
                                <Link
                                    href="/register"
                                    prefetch={true}
                                    className="px-6 py-3 text-base font-bold text-black bg-[#FF8C69] border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-1"
                                >
                                    Get Started
                                    <ChevronRight className="w-5 h-5" />
                                </Link>
                            </div>
                        )}

                        {/* Mobile Menu Toggle */}
                        <button
                            className="md:hidden p-2 rounded-xl border-2 border-black bg-white hover:bg-[#F9F8F4] transition-colors"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? (
                                <X className="w-6 h-6 text-black" />
                            ) : (
                                <Menu className="w-6 h-6 text-black" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="md:hidden bg-[#F9F8F4] border-t-2 border-black"
                    >
                        <div className="container mx-auto px-6 py-6 space-y-3">
                            {isLoggedIn ? (
                                <>
                                    {/* User Info */}
                                    <div className="flex items-center gap-3 pb-4 border-b-2 border-black">
                                        <div className="w-12 h-12 rounded-xl bg-[#B4F056] border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-black font-black text-lg">
                                            {userInitial}
                                        </div>
                                        <div>
                                            <p className="font-bold text-black">
                                                {user?.name || user?.email}
                                            </p>
                                            <p className="text-sm text-black/60">{user?.role}</p>
                                        </div>
                                    </div>

                                    {/* Nav Links */}
                                    {links.map((link) => {
                                        const Icon = link.icon;
                                        return (
                                            <Link
                                                key={link.href}
                                                href={link.href}
                                                prefetch={true}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-black transition-all ${isActive(link.href)
                                                    ? "bg-[#FF8C69] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                                    : "bg-white text-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                                    }`}
                                            >
                                                <Icon className="w-5 h-5" />
                                                {link.label}
                                            </Link>
                                        );
                                    })}

                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setMobileMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 bg-white border-2 border-black hover:bg-red-50 transition-colors"
                                    >
                                        <LogOut className="w-5 h-5" />
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    {publicLinks.map((link) => (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block px-4 py-3 text-black font-bold hover:text-[#FF8C69] transition-colors"
                                        >
                                            {link.label}
                                        </Link>
                                    ))}
                                    <div className="pt-4 border-t-2 border-black space-y-3">
                                        <Link
                                            href="/login"
                                            prefetch={true}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block w-full py-3 text-center text-black font-bold rounded-xl border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all"
                                        >
                                            Log In
                                        </Link>
                                        <Link
                                            href="/register"
                                            prefetch={true}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block w-full py-3 text-center bg-[#FF8C69] text-black font-bold rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all"
                                        >
                                            Get Started
                                        </Link>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
