export default function Footer() {
  return (
    <footer className="glass mt-12 md:mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded" />
            <span className="text-white font-bold">AI Extractor</span>
          </div>
          <p className="text-white/50 text-sm">© 2025 AI Extractor. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
