/**
 * 移除廣告訂閱
 * 而家係模擬購買（見 src/lib/premium.ts）；正式上架接 RevenueCat / 商店內購，
 * 呢個介面唔使改。
 */
import { useState } from 'react';
import { BadgeCheck, Loader2, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { APP_CONFIG } from '@/config/app';
import { restorePurchases, subscribe, usePremium } from '@/lib/premium';
import { toast } from 'sonner';

interface PremiumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PremiumDialog({ open, onOpenChange }: PremiumDialogProps) {
  const premium = usePremium();
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);

  const handleSubscribe = async () => {
    setBusy('buy');
    await subscribe();
    setBusy(null);
    onOpenChange(false);
    toast.success('已訂閱！多謝支持，廣告已移除 🎉');
  };

  const handleRestore = async () => {
    setBusy('restore');
    const ok = await restorePurchases();
    setBusy(null);
    if (ok) {
      onOpenChange(false);
      toast.success('已恢復你嘅訂閱');
    } else {
      toast.info('搵唔到之前嘅訂閱紀錄');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-amber-500" />
            移除廣告
          </DialogTitle>
          <DialogDescription className="pt-1 text-left">
            一次訂閱，小朋友睇卡唔再被打擾：
          </DialogDescription>
        </DialogHeader>

        {premium ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <BadgeCheck className="h-12 w-12 text-emerald-500" />
            <p className="font-semibold">你已經係訂閱用戶</p>
            <p className="text-sm text-slate-500">所有廣告已經移除，多謝支持！</p>
          </div>
        ) : (
          <>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex gap-2">✅ 移除底部廣告 bar</li>
              <li className="flex gap-2">✅ 唔再每 10 張卡彈插頁廣告</li>
              <li className="flex gap-2">✅ 支持我哋整多啲新卡片</li>
            </ul>

            <Button
              onClick={handleSubscribe}
              disabled={busy !== null}
              className="mt-2 h-12 w-full rounded-2xl bg-amber-400 text-base font-bold text-amber-900 hover:bg-amber-300"
            >
              {busy === 'buy' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                `${APP_CONFIG.premium.price} / ${APP_CONFIG.premium.period} · 立即訂閱`
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={handleRestore}
              disabled={busy !== null}
              className="w-full text-slate-500"
            >
              {busy === 'restore' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                '恢復購買'
              )}
            </Button>
            <p className="text-center text-xs text-slate-400">
              預覽版本為模擬購買；正式 App 會經 App Store / Google Play 收費，
              每月自動續訂，可以隨時取消。
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
