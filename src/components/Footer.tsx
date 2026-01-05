import Link from "next/link";

export default function Footer() {
    return (
        <footer className="bg-cream border-t border-subtle py-20">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                    <div className="space-y-4">
                        <h3 className="text-xl font-serif font-bold text-charcoal">TRIA</h3>
                        <p className="text-sm text-charcoal/60">
                            AI-powered fashion try-on marketplace connecting influencers and brands.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4 text-charcoal">Company</h4>
                        <ul className="space-y-2 text-sm text-charcoal/70">
                            <li><Link href="/about" className="hover:text-charcoal">About Us</Link></li>
                            <li><Link href="/register" className="hover:text-charcoal">Join Us</Link></li>
                            <li><Link href="/marketplace" className="hover:text-charcoal">Marketplace</Link></li>
                            <li><Link href="/login" className="hover:text-charcoal">Sign In</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4 text-charcoal">Features</h4>
                        <ul className="space-y-2 text-sm text-charcoal/70">
                            <li><Link href="/influencer/try-on" className="hover:text-charcoal">Virtual Try-On</Link></li>
                            <li><Link href="/brand/ads" className="hover:text-charcoal">Ad Generation</Link></li>
                            <li><Link href="/brand/campaigns" className="hover:text-charcoal">Campaigns</Link></li>
                            <li><Link href="/influencer/dashboard" className="hover:text-charcoal">Dashboard</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4 text-charcoal">Legal</h4>
                        <ul className="space-y-2 text-sm text-charcoal/70">
                            <li><Link href="/privacy" className="hover:text-charcoal">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="hover:text-charcoal">Terms of Use</Link></li>
                            <li><Link href="/contact" className="hover:text-charcoal">Contact Us</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="mt-20 pt-8 border-t border-subtle/50 flex flex-col md:flex-row justify-between items-center text-xs text-charcoal/50">
                    <p>&copy; 2025 TRIA. All rights reserved.</p>
                    <div className="flex gap-4 mt-4 md:mt-0">
                        <span>English (US)</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
