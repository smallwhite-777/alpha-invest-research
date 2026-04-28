interface SparklineProps {
  values: number[]
  color?: string
  width?: number
  height?: number
  strokeWidth?: number
}

export function Sparkline({
  values,
  color = 'currentColor',
  width = 80,
  height = 24,
  strokeWidth = 1.2,
}: SparklineProps) {
  if (values.length === 0) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * width
      const y = height - ((v - min) / range) * height
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} style={{ display: 'block' }} aria-hidden>
      <polyline points={points} fill="none" stroke={color} strokeWidth={strokeWidth} />
    </svg>
  )
}

export function generateSparkSeed(seed: number, length: number = 20): number[] {
  const arr: number[] = []
  let v = 50
  for (let i = 0; i < length; i++) {
    v += Math.sin(seed + i * 0.7) * 8 + Math.cos(seed * 2 + i) * 4
    arr.push(v)
  }
  return arr
}
