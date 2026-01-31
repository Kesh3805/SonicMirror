"use client";
import { Inter } from "next/font/google";
import "./globals.css";
import { useEffect, useState, useRef } from 'react';

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [showLogoEgg, setShowLogoEgg] = useState(false);
  const [customName, setCustomName] = useState('SonicMirror');
  const [inputValue, setInputValue] = useState('');
  const [pookieMode, setPookieMode] = useState(false);
  const [logoPosition, setLogoPosition] = useState({ x: 16, y: 16 }); // Default position
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const logoTimer = useRef<NodeJS.Timeout | null>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const footerClicks = useRef<number[]>([]);
  const catClicks = useRef<number[]>([]);
  const catPettingContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = customName;
  }, [customName]);

  // Cat petting easter egg functionality
  function handleCatClick(e: MouseEvent | React.MouseEvent) {
    if (!pookieMode) return;
    
    const now = Date.now();
    catClicks.current.push(now);
    
    // Keep only clicks from last 2 seconds
    catClicks.current = catClicks.current.filter(time => now - time < 2000);
    
    // Get click position
    const target = e.currentTarget as HTMLElement;
    const rect = target?.getBoundingClientRect() || { left: 0, top: 0 };
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Create heart effect
    if (catPettingContainer.current) {
      const heart = document.createElement('div');
      heart.className = 'purr-heart';
      heart.textContent = '💕';
      heart.style.left = `${x}px`;
      heart.style.top = `${y}px`;
      catPettingContainer.current.appendChild(heart);
      
      // Remove heart after animation
      setTimeout(() => {
        if (heart.parentNode) {
          heart.parentNode.removeChild(heart);
        }
      }, 2000);
    }
    
    // Add purring text for multiple clicks
    if (catClicks.current.length >= 3) {
      if (catPettingContainer.current) {
        const purrText = document.createElement('div');
        purrText.className = 'purr-text';
        purrText.textContent = 'Purrrrr... 😸';
        purrText.style.left = `${x + 20}px`;
        purrText.style.top = `${y - 20}px`;
        catPettingContainer.current.appendChild(purrText);
        
        // Remove text after animation
        setTimeout(() => {
          if (purrText.parentNode) {
            purrText.parentNode.removeChild(purrText);
          }
        }, 2000);
      }
      
      // Add purring animation to cat
      const catElement = e.currentTarget as HTMLElement;
      catElement.classList.add('purring');
      setTimeout(() => {
        catElement.classList.remove('purring');
      }, 500);
      
      // Create purr wave effect
      if (catPettingContainer.current) {
        const purrEffect = document.createElement('div');
        purrEffect.className = 'purr-effect';
        catPettingContainer.current.appendChild(purrEffect);
        
        // Remove effect after animation
        setTimeout(() => {
          if (purrEffect.parentNode) {
            purrEffect.parentNode.removeChild(purrEffect);
          }
        }, 1000);
      }
      
      catClicks.current = []; // Reset after purring
    }
  }

  // Global Pookie Mode effect - persists across all pages
  useEffect(() => {
    if (pookieMode) {
      document.body.classList.add('pookie-mode');
      
      // Add sparkles element to DOM
      const sparkles = document.createElement('div');
      sparkles.className = 'sparkles';
      document.body.appendChild(sparkles);
      
      // Add cat-hearts element to DOM
      const catHearts = document.createElement('div');
      catHearts.className = 'cat-hearts';
      document.body.appendChild(catHearts);
      
      // Create interactive cat mascot
      const catMascot = document.createElement('div');
      catMascot.className = 'cat-mascot';
      catMascot.textContent = '😺';
      catMascot.onclick = (e: MouseEvent) => handleCatClick(e);
      document.body.appendChild(catMascot);
      
      // Create cat petting container for effects
      const pettingContainer = document.createElement('div');
      pettingContainer.className = 'cat-petting';
      document.body.appendChild(pettingContainer);
      
      // Store reference to petting container
      catPettingContainer.current = pettingContainer;
      
      // Add rainbow text effect to headings
      const headings = document.querySelectorAll('h1, h2, h3');
      headings.forEach(heading => {
        if (!heading.classList.contains('rainbow-text')) {
          heading.classList.add('rainbow-text');
        }
      });
      
      // Add sparkle effects to cards
      const cards = document.querySelectorAll('.bg-white, .bg-gray-50, [class*="rounded"]');
      cards.forEach(card => {
        if (!card.classList.contains('card')) {
          card.classList.add('card');
        }
      });
      
      // Add bounce effects to buttons
      const buttons = document.querySelectorAll('button');
      buttons.forEach(button => {
        if (!button.classList.contains('bounce-element')) {
          button.classList.add('bounce-element');
        }
      });
      
      // Add click effects to document
      const handlePookieClick = (e: MouseEvent) => {
        // Create floating heart at click position
        const heart = document.createElement('div');
        heart.className = 'floating-heart';
        heart.textContent = ['💖', '💗', '💓', '💞', '💕'][Math.floor(Math.random() * 5)];
        heart.style.left = `${e.clientX}px`;
        heart.style.top = `${e.clientY}px`;
        heart.style.position = 'fixed';
        heart.style.pointerEvents = 'none';
        heart.style.zIndex = '10000';
        heart.style.animation = 'heartRain 2s linear forwards';
        document.body.appendChild(heart);
        
        // Remove heart after animation
        setTimeout(() => {
          if (document.body.contains(heart)) {
            document.body.removeChild(heart);
          }
        }, 2000);
      };
      
      document.addEventListener('click', handlePookieClick);
      
      // Add keyboard effects
      const handlePookieKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          // Create sparkle effect
          const sparkle = document.createElement('div');
          sparkle.className = 'magic-sparkle';
          sparkle.textContent = '✨';
          sparkle.style.left = `${Math.random() * window.innerWidth}px`;
          sparkle.style.top = `${Math.random() * window.innerHeight}px`;
          sparkle.style.fontSize = `${1 + Math.random()}rem`;
          document.body.appendChild(sparkle);
          
          setTimeout(() => {
            if (document.body.contains(sparkle)) {
              document.body.removeChild(sparkle);
            }
          }, 1000);
        }
      };
      
      document.addEventListener('keydown', handlePookieKeydown);
      
      // Create diverse floating emoji elements
      const emojis = [
        { content: '🐈', class: 'floating-emoji-1' },
        { content: '🐈‍⬛', class: 'floating-emoji-2' },
        { content: '😸', class: 'floating-emoji-3' },
        { content: '🎀', class: 'floating-emoji-4' },
        { content: '🧶', class: 'floating-emoji-5' },
        { content: '🐟', class: 'floating-emoji-6' },
        { content: '🐠', class: 'floating-emoji-7' },
        { content: '🐡', class: 'floating-emoji-8' },
        { content: '🪺', class: 'floating-emoji-9' },
        { content: '💕', class: 'floating-emoji-10' },
        { content: '💖', class: 'floating-emoji-11' },
        { content: '💝', class: 'floating-emoji-12' },
        { content: '✨', class: 'floating-emoji-13' },
        { content: '🌟', class: 'floating-emoji-14' },
        { content: '💫', class: 'floating-emoji-15' },
        { content: '🌸', class: 'floating-emoji-16' },
        { content: '😻', class: 'floating-emoji-17' },
        { content: '😽', class: 'floating-emoji-18' },
        { content: '🌺', class: 'floating-emoji-19' },
        { content: '🌷', class: 'floating-emoji-20' }
      ];
      
      emojis.forEach(emoji => {
        const element = document.createElement('div');
        element.className = emoji.class;
        element.textContent = emoji.content;
        element.style.position = 'fixed';
        element.style.fontSize = '1.5rem';
        element.style.pointerEvents = 'none';
        element.style.zIndex = '998';
        element.style.opacity = '0.7';
        document.body.appendChild(element);
      });
      
      // Cleanup function to remove elements when component unmounts or pookie mode is disabled
      return () => {
        document.body.classList.remove('pookie-mode');
        const existingSparkles = document.querySelector('.sparkles');
        const existingCatHearts = document.querySelector('.cat-hearts');
        const existingCatMascot = document.querySelector('.cat-mascot');
        const existingPettingContainer = document.querySelector('.cat-petting');
        const existingFloatingEmojis = document.querySelectorAll('[class^="floating-emoji-"]');
        
        if (existingSparkles) existingSparkles.remove();
        if (existingCatHearts) existingCatHearts.remove();
        if (existingCatMascot) existingCatMascot.remove();
        if (existingPettingContainer) existingPettingContainer.remove();
        existingFloatingEmojis.forEach(el => el.remove());
        
        // Remove event listeners
        document.removeEventListener('click', handlePookieClick);
        document.removeEventListener('keydown', handlePookieKeydown);
        
        // Remove pookie mode classes
        const headings = document.querySelectorAll('h1, h2, h3');
        headings.forEach(heading => heading.classList.remove('rainbow-text'));
        
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => card.classList.remove('card'));
        
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => button.classList.remove('bounce-element'));
      };
    } else {
      document.body.classList.remove('pookie-mode');
      const existingSparkles = document.querySelector('.sparkles');
      const existingCatHearts = document.querySelector('.cat-hearts');
      const existingCatMascot = document.querySelector('.cat-mascot');
      const existingPettingContainer = document.querySelector('.cat-petting');
      const existingFloatingEmojis = document.querySelectorAll('[class^="floating-emoji-"]');
      
      if (existingSparkles) existingSparkles.remove();
      if (existingCatHearts) existingCatHearts.remove();
      if (existingCatMascot) existingCatMascot.remove();
      if (existingPettingContainer) existingPettingContainer.remove();
      existingFloatingEmojis.forEach(el => el.remove());
    }
  }, [pookieMode]);

  // Global footer click handler for pookie mode activation
  useEffect(() => {
    function handleGlobalFooterClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest('footer') || target.textContent?.includes('-- .- -. ---')) {
        const now = Date.now();
        footerClicks.current.push(now);
        
        // Keep only clicks from last 3 seconds
        footerClicks.current = footerClicks.current.filter(time => now - time < 3000);
        
        // If 3 clicks within 3 seconds, activate Pookie Mode
        if (footerClicks.current.length >= 3) {
          setPookieMode(true);
          footerClicks.current = []; // Reset
        }
      }
    }

    document.addEventListener('click', handleGlobalFooterClick);
    return () => document.removeEventListener('click', handleGlobalFooterClick);
  }, []);

  function handleLogoMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const rect = logoRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
    setIsDragging(true);
    
    // Start the easter egg timer
    logoTimer.current = setTimeout(() => {
      setShowLogoEgg(true);
    }, 1000);
  }

  function handleLogoMouseUp() {
    setIsDragging(false);
    if (logoTimer.current) {
      clearTimeout(logoTimer.current);
      logoTimer.current = null;
    }
  }

  function handleLogoMouseLeave() {
    setIsDragging(false);
    if (logoTimer.current) {
      clearTimeout(logoTimer.current);
      logoTimer.current = null;
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep logo within viewport bounds
      const maxX = window.innerWidth - 48; // 48px for logo width
      const maxY = window.innerHeight - 48; // 48px for logo height
      
      setLogoPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = logoRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      });
    }
    setIsDragging(true);
    
    // Start the easter egg timer
    logoTimer.current = setTimeout(() => {
      setShowLogoEgg(true);
    }, 1000);
  }

  function handleTouchMove(e: TouchEvent) {
    if (isDragging) {
      e.preventDefault();
      const touch = e.touches[0];
      const newX = touch.clientX - dragOffset.x;
      const newY = touch.clientY - dragOffset.y;
      
      // Keep logo within viewport bounds
      const maxX = window.innerWidth - 48;
      const maxY = window.innerHeight - 48;
      
      setLogoPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  }

  function handleTouchEnd() {
    setIsDragging(false);
    if (logoTimer.current) {
      clearTimeout(logoTimer.current);
      logoTimer.current = null;
    }
  }

  // Add global mouse and touch event listeners
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
    const handleGlobalTouchMove = (e: TouchEvent) => handleTouchMove(e);
    const handleGlobalMouseUp = () => setIsDragging(false);
    const handleGlobalTouchEnd = () => handleTouchEnd();

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchend', handleGlobalTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging, dragOffset]);

  function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inputValue.trim()) {
      setCustomName(inputValue.trim());
      setInputValue('');
      setShowLogoEgg(false);
    }
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Draggable SonicMirror Logo */}
        <div 
          ref={logoRef}
          className="fixed z-40 cursor-grab active:cursor-grabbing select-none"
          style={{
            left: `${logoPosition.x}px`,
            top: `${logoPosition.y}px`,
            transform: isDragging ? 'scale(1.1)' : 'scale(1)',
            transition: isDragging ? 'none' : 'transform 0.2s ease'
          }}
        >
          <div 
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-2xl rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 hover:rotate-360 hover:shadow-green-400/50 hover:shadow-2xl group"
            onMouseDown={handleLogoMouseDown}
            onMouseUp={handleLogoMouseUp}
            onMouseLeave={handleLogoMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            title="Drag me around! Long-press for a surprise!"
          >
            <span className="group-hover:animate-pulse">{customName.charAt(0)}</span>
          </div>
        </div>
        
        {children}

        {/* Logo Easter Egg Modal */}
        {showLogoEgg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-purple-900 via-pink-800 to-purple-800 rounded-3xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center relative border border-purple-400 overflow-hidden">
              {/* Animated background particles */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-4 left-4 w-2 h-2 bg-pink-400 rounded-full animate-pulse"></div>
                <div className="absolute top-8 right-8 w-1 h-1 bg-purple-300 rounded-full animate-ping"></div>
                <div className="absolute bottom-6 left-6 w-1.5 h-1.5 bg-pink-300 rounded-full animate-bounce"></div>
                <div className="absolute bottom-12 right-12 w-1 h-1 bg-purple-400 rounded-full animate-pulse"></div>
              </div>
              
              <button 
                className="absolute top-3 right-3 text-purple-300 hover:text-pink-300 text-2xl font-bold transition-all duration-200 hover:scale-110 z-10" 
                onClick={() => setShowLogoEgg(false)}
              >
                &times;
              </button>
              
              {/* Enhanced decorative elements */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 rounded-t-3xl animate-pulse"></div>
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <span className="text-2xl">🎵</span>
              </div>
              
              <div className="mt-8 text-center relative z-10">
                <h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent animate-pulse">
                  Welcome to {customName}!
                </h3>
                <p className="mb-6 text-lg text-purple-200 text-center leading-relaxed">
                  🎉 You found one of the many easter eggs hidden throughout SonicMirror! 
                  <br />
                  <span className="text-sm text-pink-300 font-semibold">✨ Keep exploring to discover more surprises...</span>
                </p>
                
                {/* Fun stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-purple-800/30 rounded-lg p-3 border border-purple-400/50">
                    <div className="text-2xl font-bold text-pink-300">🎵</div>
                    <div className="text-xs text-purple-200">Music Magic</div>
                  </div>
                  <div className="bg-pink-800/30 rounded-lg p-3 border border-pink-400/50">
                    <div className="text-2xl font-bold text-purple-300">🌟</div>
                    <div className="text-xs text-pink-200">Hidden Gems</div>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleNameSubmit} className="w-full space-y-4 relative z-10">
                <div>
                  <label className="block text-sm font-semibold text-purple-200 mb-2">
                    ✨ Give this webpage a new name:
                  </label>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Enter a magical name..."
                    className="w-full px-4 py-3 border-2 border-purple-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition-all duration-200 bg-purple-800/50 backdrop-blur-sm text-purple-100 placeholder-purple-300 hover:bg-purple-800/70"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl animate-pulse"
                >
                  ✨ Update Name ✨
                </button>
              </form>
              
              {/* Bottom decorative element */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 rounded-b-3xl animate-pulse"></div>
              
              {/* Floating music notes */}
              <div className="absolute top-1/4 left-4 text-pink-300 animate-bounce" style={{animationDelay: '0.5s'}}>♪</div>
              <div className="absolute top-1/3 right-6 text-purple-300 animate-bounce" style={{animationDelay: '1s'}}>♫</div>
              <div className="absolute bottom-1/4 left-8 text-pink-400 animate-bounce" style={{animationDelay: '1.5s'}}>♬</div>
            </div>
          </div>
        )}

        {/* Add these inside your main layout JSX, near the root div, so they appear on all pages when pookie mode is active */}
        {pookieMode && (
          <>
            <div className="music-notes">🎶</div>
            <div className="heart-rain">💖💗💓💞💕</div>
            <div className="paw-prints">🐾</div>
            
            {/* Interactive pookie mode elements */}
            <div className="cat-mascot" onClick={handleCatClick}>😺</div>
            
            {/* Floating hearts that appear on click */}
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="floating-heart"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: `${3 + Math.random() * 2}s`
                }}
              >
                {['💖', '💗', '💓', '💞', '💕'][i]}
              </div>
            ))}
            
            {/* Magic sparkles that appear randomly */}
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={`sparkle-${i}`}
                className="magic-sparkle"
                style={{
                  left: `${20 + i * 30}%`,
                  top: `${30 + i * 20}%`,
                  animationDelay: `${i * 2}s`,
                  fontSize: `${1.5 + Math.random()}rem`
                }}
              >
                ✨
              </div>
            ))}
          </>
        )}
      </body>
    </html>
  );
}
