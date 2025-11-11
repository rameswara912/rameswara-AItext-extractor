"use client"

import { Menu, X } from "lucide-react"
import { useState } from "react"

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg" />
            <span className="text-white font-bold text-xl hidden sm:inline">AI Extractor</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex gap-8 items-center">
            <a href="#" className="text-white/70 hover:text-white transition">
              Home
            </a>
            <a href="#" className="text-white/70 hover:text-white transition">
              Features
            </a>
            <a href="#" className="text-white/70 hover:text-white transition">
              Docs
            </a>
            <a href="/login" className="text-white/70 hover:text-white transition">
              Login
            </a>
            <button className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition glow-border">
              Get Started
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-white">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-3">
            <a href="#" className="block text-white/70 hover:text-white">
              Home
            </a>
            <a href="#" className="block text-white/70 hover:text-white">
              Features
            </a>
            <a href="#" className="block text-white/70 hover:text-white">
              Docs
            </a>
            <a href="/login" className="block text-white/70 hover:text-white">
              Login
            </a>
            <button className="w-full px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition">
              Get Started
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
