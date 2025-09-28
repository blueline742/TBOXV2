'use client'

import { useEffect, useRef, useState } from 'react'
import { useCombatLog } from '@/stores/optimizedGameStore'
import type { CombatLogEntry } from '@/stores/optimizedGameStore'

function CombatLogItem({ entry, index }: { entry: CombatLogEntry; index: number }) {
  const isHealing = !!entry.totalHealing && entry.totalHealing > 0
  const isDamage = !!entry.totalDamage && entry.totalDamage > 0
  const [isVisible, setIsVisible] = useState(false)
  const [isFading, setIsFading] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    const showTimer = setTimeout(() => setIsVisible(true), index * 100)

    // Start fading after 3 seconds
    const fadeTimer = setTimeout(() => setIsFading(true), 3000)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(fadeTimer)
    }
  }, [])

  return (
    <div
      className={`combat-log-item ${isVisible ? 'visible' : ''} ${isFading ? 'fading' : ''}`}
      role="listitem"
      aria-live="polite"
    >
      <div className="combat-log-row">
        {/* Attacker */}
        <div className="card-portrait attacker" title={entry.attackerCard.name}>
          <div className="card-image-wrapper">
            <img
              src={entry.attackerCard.texture}
              alt={entry.attackerCard.name}
              className="card-image"
              loading="lazy"
              draggable={false}
            />
          </div>
          <div className="card-name">{entry.attackerCard.name}</div>
        </div>

        {/* Action / numbers */}
        <div className="action-indicator">
          <div className="ability-name" title={entry.abilityName}>
            {entry.abilityName}
          </div>

          <div className="damage-heal-row">
            {isDamage && <span className="damage-amount">-{entry.totalDamage}</span>}
            {isHealing && <span className="healing-amount">+{entry.totalHealing}</span>}
          </div>

          {entry.effects && entry.effects.length > 0 && (
            <div className="effects-list">
              {entry.effects.map((effect, idx) => (
                <span key={idx} className="effect-tag">{effect}</span>
              ))}
            </div>
          )}
        </div>

        {/* Targets */}
        <div className="target-cards" aria-hidden={false}>
          {entry.targetCards.length > 0 ? (
            <>
              {entry.targetCards.slice(0, 3).map((t, i) => (
                <div key={i} className="card-portrait target" title={t.name}>
                  <div className="card-image-wrapper">
                    <img src={t.texture} alt={t.name} className="card-image" loading="lazy" draggable={false} />
                  </div>
                  <div className="card-name">{t.name}</div>
                </div>
              ))}
              {entry.targetCards.length > 3 && (
                <div className="more-targets">+{entry.targetCards.length - 3}</div>
              )}
            </>
          ) : (
            <div className="no-target">No target</div>
          )}
        </div>
      </div>

      <style jsx>{`
        /* Responsive thumbnail sizing via CSS variable */
        :root {
          --card-w: 40px; /* base thumbnail width */
        }

        .combat-log-item {
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 10px;
          padding: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
          pointer-events: auto;
          opacity: 0;
          transform: translateX(-20px) scale(0.8);
          transition: all 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .combat-log-item.visible {
          opacity: 1;
          transform: translateX(0) scale(1);
          animation: bounceIn 600ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .combat-log-item.fading {
          opacity: 0;
          transform: translateX(-10px) scale(0.95);
          transition: all 500ms ease-out;
        }

        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: translateX(-30px) scale(0.5);
          }
          60% {
            opacity: 1;
            transform: translateX(5px) scale(1.05);
          }
          100% {
            transform: translateX(0) scale(1);
          }
        }

        .combat-log-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: nowrap; /* IMPORTANT: prevent attacker from wrapping onto its own line */
        }

        /* Portraits */
        .card-portrait {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          flex: 0 0 auto; /* don't stretch */
          width: var(--card-w);
        }

        .card-portrait.attacker {
          width: calc(var(--card-w) * 1.25); /* 50px for attacker */
        }

        .card-portrait.target {
          width: calc(var(--card-w) * 0.95); /* 38px for targets */
          flex: 0 0 auto; /* prevent shrinking */
        }

        .card-image-wrapper {
          width: 100%;
          /* keep aspect roughly cardy (3:4) */
          aspect-ratio: 3 / 4;
          border-radius: 6px;
          overflow: hidden;
          border: 2px solid rgba(255, 215, 0, 0.55);
          box-shadow: 0 2px 6px rgba(0,0,0,0.45);
          background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%);
          display: block;
          position: relative;
        }

        /* Make sure the image cannot overflow and we remove transforms */
        .card-image-wrapper img.card-image {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          object-position: center 25% !important;
          transform: none !important;
          max-width: 100% !important;
          display: block !important;
          user-select: none;
          position: absolute;
          top: 0;
          left: 0;
        }

        .card-name {
          color: #fff;
          font-size: 10px;
          text-align: center;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Action column should be compact */
        .action-indicator {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: flex-start;
          flex: 0 0 auto;
          min-width: 80px;
        }

        .ability-name {
          font-weight: 600;
          color: #4ecdc4;
          font-size: 11px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .damage-heal-row {
          display: flex;
          gap: 8px;
          align-items: baseline;
        }

        .damage-amount {
          color: #ff6b6b;
          font-weight: bold;
          font-size: 16px;
          text-shadow: 0 2px 3px rgba(0,0,0,0.6);
        }

        .healing-amount {
          color: #51cf66;
          font-weight: bold;
          font-size: 16px;
          text-shadow: 0 2px 3px rgba(0,0,0,0.6);
        }

        .effects-list {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .effect-tag {
          background: rgba(138, 43, 226, 0.18);
          color: #da77f2;
          padding: 1px 4px;
          border-radius: 3px;
          font-size: 9px;
          border: 1px solid rgba(138, 43, 226, 0.45);
          text-transform: uppercase;
        }

        /* Targets container - takes remaining space */
        .target-cards {
          display: flex;
          gap: 4px;
          align-items: center;
          flex: 1 0 auto;
          justify-content: flex-end;
          overflow: hidden; /* prevent overflow */
        }

        .no-target {
          color: rgba(255,255,255,0.3);
          font-size: 10px;
          font-style: italic;
        }

        .more-targets {
          color: rgba(255,255,255,0.65);
          font-size: 10px;
          padding-left: 2px;
          white-space: nowrap;
        }

        /* Mobile breakpoints */
        @media (max-width: 520px) {
          :root { --card-w: 32px; }
          .combat-log-row {
            gap: 6px;
          }
          .action-indicator {
            min-width: 60px;
          }
          .ability-name { font-size: 10px; }
          .damage-amount, .healing-amount { font-size: 14px; }
          .target-cards { gap: 3px; }
        }

        @media (max-width: 360px) {
          :root { --card-w: 28px; }
          .card-name { display: none; }
          .combat-log-row { gap: 4px; }
          .action-indicator {
            min-width: 50px;
          }
          .ability-name { font-size: 9px; }
          .damage-amount, .healing-amount { font-size: 12px; }
          .target-cards { gap: 2px; }
        }
      `}</style>
    </div>
  )
}

export function CombatLog() {
  const { entries } = useCombatLog()
  const logRef = useRef<HTMLDivElement>(null)

  // Scroll to top so newest shows at the top
  useEffect(() => {
    if (logRef.current && entries.length > 0) {
      logRef.current.scrollTop = 0
    }
  }, [entries])

  // Only show the most recent 3 entries for top-center layout
  const recentEntries = entries.slice(0, 3)

  return (
    <div className="combat-log-container">
      <div ref={logRef} className="combat-log-scroll" role="list">
        {recentEntries.length > 0 &&
          recentEntries.map((entry, index) => (
            <CombatLogItem key={entry.id} entry={entry} index={index} />
          ))
        }
      </div>

      <style jsx>{`
        .combat-log-container {
          position: fixed;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          width: 500px;
          max-width: calc(100vw - 24px);
          height: auto;
          max-height: 250px;
          z-index: 100;
          pointer-events: none;
        }

        .combat-log-scroll {
          height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .combat-log-scroll::-webkit-scrollbar {
          display: none;
        }

        @media (max-width: 768px) {
          .combat-log-container {
            width: 420px;
            max-height: 200px;
          }
        }

        @media (max-width: 480px) {
          .combat-log-container {
            width: calc(100vw - 20px);
            max-height: 180px;
          }
        }
      `}</style>
    </div>
  )
}