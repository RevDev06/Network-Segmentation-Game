import { useEffect, useRef } from "react"
import { mountGame } from "./game.js"

export default function App() {
  const laboratory = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (laboratory.current) return mountGame(laboratory.current)
  }, [])
  return (
    <div
      ref={laboratory}
      className="min-h-screen bg-background text-foreground"
    />
  )
}
