'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(40,30%,97%)] to-[hsl(50,30%,95%)] dark:from-[hsl(220,45%,4%)] dark:to-[hsl(220,40%,6%)] p-6">
      <div className="text-center max-w-md">
        {/* Talkingo Logo */}
        <div className="mx-auto w-20 h-20 mb-8 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
          <svg viewBox="0 0 120 120" className="w-14 h-14">
            <path d="M35 32H85M60 32V96" stroke="white" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[hsl(240,24%,10%)] dark:text-white mb-3">
          You&apos;re Offline
        </h1>
        
        <p className="text-[hsl(240,8%,44%)] dark:text-[hsl(240,8%,70%)] mb-8 leading-relaxed">
          It looks like you&apos;ve lost your internet connection. 
          Talkingo needs a connection to chat with your AI language partner.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200 active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Try Again
        </button>

        <p className="mt-6 text-sm text-[hsl(240,8%,44%)] dark:text-[hsl(240,8%,60%)]">
          Check your Wi-Fi or mobile data and try again.
        </p>
      </div>
    </div>
  )
}
