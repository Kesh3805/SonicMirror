'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
  variant?: 'dark' | 'light' | 'transparent';
  showLogin?: boolean;
}

export function Navbar({ variant = 'transparent', showLogin = true }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const bgClasses = {
    dark: 'bg-gray-900/95 border-gray-800',
    light: 'bg-white/95 border-gray-200',
    transparent: isScrolled ? 'bg-gray-900/95 border-gray-800' : 'bg-transparent border-transparent',
  };

  const textClasses = {
    dark: 'text-white',
    light: 'text-gray-900',
    transparent: 'text-white',
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${bgClasses[variant]} backdrop-blur-lg border-b`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center"
              >
                <span className="text-white text-lg">🎵</span>
              </motion.div>
              <span className={`text-xl font-bold ${textClasses[variant]} group-hover:text-pink-400 transition-colors`}>
                SonicMirror
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <NavLink href="/#features" variant={variant}>Features</NavLink>
              <NavLink href="/#analytics" variant={variant}>Analytics</NavLink>
              <NavLink href="/#about" variant={variant}>About</NavLink>
              
              {showLogin && (
                <Link href="/login">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-5 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-full text-sm hover:shadow-lg hover:shadow-pink-500/25 transition-shadow"
                  >
                    Get Started
                  </motion.button>
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              <div className={`w-6 h-5 relative flex flex-col justify-between ${textClasses[variant]}`}>
                <motion.span
                  animate={isMobileMenuOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
                  className="w-full h-0.5 bg-current rounded-full"
                />
                <motion.span
                  animate={isMobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
                  className="w-full h-0.5 bg-current rounded-full"
                />
                <motion.span
                  animate={isMobileMenuOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
                  className="w-full h-0.5 bg-current rounded-full"
                />
              </div>
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-16 z-40 bg-gray-900/98 backdrop-blur-lg md:hidden"
          >
            <div className="px-4 py-6 space-y-4">
              <MobileNavLink href="/#features" onClick={() => setIsMobileMenuOpen(false)}>
                Features
              </MobileNavLink>
              <MobileNavLink href="/#analytics" onClick={() => setIsMobileMenuOpen(false)}>
                Analytics
              </MobileNavLink>
              <MobileNavLink href="/#about" onClick={() => setIsMobileMenuOpen(false)}>
                About
              </MobileNavLink>
              
              {showLogin && (
                <Link href="/login" className="block">
                  <button className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-xl mt-4">
                    Get Started
                  </button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NavLink({ href, children, variant }: { href: string; children: React.ReactNode; variant: string }) {
  const textClasses = {
    dark: 'text-gray-300 hover:text-white',
    light: 'text-gray-600 hover:text-gray-900',
    transparent: 'text-gray-300 hover:text-white',
  };

  return (
    <Link 
      href={href} 
      className={`text-sm font-medium transition-colors ${textClasses[variant as keyof typeof textClasses]}`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className="block text-white text-lg font-medium py-2 border-b border-gray-800"
    >
      {children}
    </Link>
  );
}

export default Navbar;
