'use client'

import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PeerData } from '@/types/financial'

interface PeerComparisonSelectorProps {
  availablePeers: PeerData[]
  selectedPeers: string[]
  onPeerSelect: (peers: string[]) => void
  maxPeers?: number
  isDark?: boolean
}

export function PeerComparisonSelector({
  availablePeers,
  selectedPeers,
  onPeerSelect,
  maxPeers = 5,
  isDark = false
}: PeerComparisonSelectorProps) {
  const handleTogglePeer = (peerCode: string) => {
    if (selectedPeers.includes(peerCode)) {
      onPeerSelect(selectedPeers.filter(p => p !== peerCode))
    } else if (selectedPeers.length < maxPeers) {
      onPeerSelect([...selectedPeers, peerCode])
    }
  }

  if (availablePeers.length === 0) {
    return null
  }

  return (
    <Card className="p-4 bg-card border-border">
      <Label className="text-sm text-muted-foreground mb-2 block">
        同行对比选择器 (最多选择{maxPeers}家)
      </Label>

      <div className="flex flex-wrap gap-2 mb-3">
        {availablePeers.map(peer => (
          <Badge
            key={peer.stock_code}
            variant={selectedPeers.includes(peer.stock_code) ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer transition-colors',
              selectedPeers.includes(peer.stock_code)
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted/50'
            )}
            onClick={() => handleTogglePeer(peer.stock_code)}
          >
            {peer.stock_name}
            {selectedPeers.includes(peer.stock_code) && (
              <Check className="w-3 h-3 ml-1" />
            )}
          </Badge>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPeerSelect(availablePeers.slice(0, maxPeers).map(p => p.stock_code))}
          disabled={selectedPeers.length >= maxPeers}
        >
          选择前{maxPeers}家
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPeerSelect([])}
        >
          清空选择
        </Button>
      </div>
    </Card>
  )
}