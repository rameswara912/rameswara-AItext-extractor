"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { motion } from "framer-motion"

interface ImagePreviewProps {
  imageUrl: string
}

export default function ImagePreview({ imageUrl }: ImagePreviewProps) {
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)

  const MIN_ZOOM = 1
  const MAX_ZOOM = 3

  // Handle mouse wheel zoom
  const handleWheel = (e: WheelEvent) => {
    if (!containerRef.current?.contains(e.target as Node)) return
    e.preventDefault()

    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta))
    setZoom(newZoom)
  }

  // Handle mouse drag for pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return

    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y

    const maxX = (containerRef.current?.offsetWidth || 0) * (zoom - 1) * 0.5
    const maxY = (containerRef.current?.offsetHeight || 0) * (zoom - 1) * 0.5

    setPosition({
      x: Math.max(-maxX, Math.min(maxX, newX)),
      y: Math.max(-maxY, Math.min(maxY, newY)),
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Handle touch pinch zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      setDragStart({ x: distance, y: 0 })
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      const delta = (distance - dragStart.x) * 0.01
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta))
      setZoom(newZoom)
      setDragStart({ x: distance, y: 0 })
    }
  }

  // Reset zoom
  const handleReset = () => {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
  }

  // Zoom controls
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(MAX_ZOOM, prev + 0.2))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(MIN_ZOOM, prev - 0.2))
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener("wheel", handleWheel, { passive: false })
    window.addEventListener("mousemove", handleMouseMove as any)
    window.addEventListener("mouseup", handleMouseUp)
    window.addEventListener("touchmove", handleTouchMove as any)

    return () => {
      container.removeEventListener("wheel", handleWheel)
      window.removeEventListener("mousemove", handleMouseMove as any)
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("touchmove", handleTouchMove as any)
    }
  }, [zoom, position, isDragging, dragStart])

  return (
    <div className="h-full flex flex-col">
      {/* Preview Container with Glassmorphism */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden rounded-2xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(59, 130, 246, 0.05) 50%, rgba(255, 193, 7, 0.05) 100%)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 0 30px rgba(255, 193, 7, 0.2)",
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Image Container */}
        <motion.div
          ref={imageRef}
          className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
          animate={{
            scale: zoom,
            x: position.x,
            y: position.y,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 60,
          }}
        >
          {imageUrl && (
            <Image
              src={imageUrl || "/placeholder.svg"}
              alt="Uploaded table"
              width={600}
              height={800}
              className="max-w-full max-h-full object-contain select-none"
              draggable={false}
            />
          )}
        </motion.div>

        {/* Zoom Controls - Top Right */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="p-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 text-black rounded-lg transition backdrop-blur-sm"
          >
            <ZoomIn className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="p-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 text-black rounded-lg transition backdrop-blur-sm"
          >
            <ZoomOut className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReset}
            className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition backdrop-blur-sm"
          >
            <RotateCcw className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Zoom Info */}
        <div className="absolute bottom-4 left-4 px-3 py-2 bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 text-white text-xs font-medium">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Info Text */}
      <p className="text-white/60 text-xs mt-2">{zoom > 1 ? "Drag to pan • " : ""} Scroll to zoom • Pinch on mobile</p>
    </div>
  )
}
