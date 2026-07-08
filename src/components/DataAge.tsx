import React from 'react'

interface Props { file: string; label?: string }
export default function DataAge({ file, label = 'data' }: Props) {
  const [age, setAge] = React.useState('')
  React.useEffect(() => {
    const buildTime = (window as any).__BUILD_TIME__
    if (buildTime) {
      const mins = Math.round((Date.now() - new Date(buildTime).getTime()) / 60000)
      if (mins < 60) setAge(mins + 'm ago')
      else if (mins < 1440) setAge(Math.round(mins / 60) + 'h ago')
      else setAge(Math.round(mins / 1440) + 'd ago')
    }
  }, [])
  if (!age) return null
  return <span style={{ fontSize: 10, color: '#938F99', fontFamily: 'Roboto Mono,monospace' }}>· {label} {age}</span>
}
