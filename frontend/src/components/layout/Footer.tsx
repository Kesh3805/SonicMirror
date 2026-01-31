'use client';
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">🎵</span>
              </div>
              <span className="text-2xl font-bold text-white">SonicMirror</span>
            </Link>
            <p className="text-gray-400 max-w-sm">
              AI-powered Spotify analyzer that reveals what your music taste really says about you. 
              Get roasted, analyzed, and discover your musical identity.
            </p>
            <div className="flex gap-4 mt-6">
              <SocialLink href="https://twitter.com" icon="𝕏" label="Twitter" />
              <SocialLink href="https://github.com" icon="⌘" label="GitHub" />
              <SocialLink href="https://discord.com" icon="💬" label="Discord" />
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Features</h4>
            <ul className="space-y-2">
              <FooterLink href="/#features">AI Roasts</FooterLink>
              <FooterLink href="/#features">Personality Analysis</FooterLink>
              <FooterLink href="/#features">Mood Detection</FooterLink>
              <FooterLink href="/#features">Music Stats</FooterLink>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
              <FooterLink href="/terms">Terms of Service</FooterLink>
              <FooterLink href="/contact">Contact Us</FooterLink>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © {currentYear} SonicMirror. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm flex items-center gap-2">
            Made with <span className="text-red-500">❤️</span> and <span className="text-green-500">🎵</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link 
        href={href} 
        className="text-gray-400 hover:text-white transition-colors text-sm"
      >
        {children}
      </Link>
    </li>
  );
}

function SocialLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
      aria-label={label}
    >
      {icon}
    </motion.a>
  );
}

export default Footer;
