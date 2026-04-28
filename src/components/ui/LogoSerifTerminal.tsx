interface LogoSerifTerminalProps {
  size?: number
  color?: string
  showCursor?: boolean
  className?: string
}

export function LogoSerifTerminal({
  size = 24,
  color = 'currentColor',
  showCursor = true,
  className,
}: LogoSerifTerminalProps) {
  return (
    <span
      className={className}
      style={{
        fontFamily: '"Cormorant Garamond", "Noto Serif SC", serif',
        fontSize: size,
        color,
        fontWeight: 400,
        letterSpacing: '-0.01em',
        display: 'inline-flex',
        alignItems: 'baseline',
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      <span style={{ opacity: 0.4, fontWeight: 300, marginRight: size * 0.18 }}>{'>'}</span>
      <span>open</span>
      <span
        style={{
          position: 'relative',
          fontStyle: 'italic',
          fontWeight: 300,
          margin: '0 0.04em',
        }}
      >
        1
        <span
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '-6%',
            transform: 'translateX(-50%)',
            width: '70%',
            height: Math.max(1, size * 0.025),
            background: color,
          }}
        />
      </span>
      <span>nvest</span>
      {showCursor && (
        <span
          style={{
            marginLeft: size * 0.16,
            width: size * 0.14,
            height: size * 0.55,
            background: color,
            alignSelf: 'center',
            opacity: 0.8,
            animation: 'logoBlink 1.05s steps(2) infinite',
          }}
        />
      )}
    </span>
  )
}
