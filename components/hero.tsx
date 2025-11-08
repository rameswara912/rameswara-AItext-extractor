"use client"

import type React from "react"

import { Upload } from "lucide-react"
import { useState } from "react"

interface HeroProps {
  onImageUpload: (imageUrl: string) => void
}

export default function Hero({ onImageUpload }: HeroProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageUpload(event.target.result as string)
        }
      }
      reader.readAsDataURL(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageUpload(event.target.result as string)
        }
      }
      reader.readAsDataURL(files[0])
    }
  }

  return (
    <section className="w-full h-full flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`glass glass-hover p-8 md:p-12 text-center cursor-pointer transition-all ${
            isDragging ? "border-yellow-500 bg-white/10 glow-border" : ""
          }`}
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 rounded-full">
              <Upload className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <h2 className="gradient-text text-2xl md:text-3xl font-bold mb-3">Extract Data from Tables</h2>
          <p className="text-white/60 mb-8">Upload any image containing a table and AI will extract the data for you</p>

          <label className="inline-block">
            <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            <span className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg cursor-pointer transition glow-border inline-block">
              Choose Image
            </span>
          </label>

          <p className="text-white/40 text-sm mt-6">or drag and drop your image here</p>
        </div>
      </div>
    </section>
  )
}
