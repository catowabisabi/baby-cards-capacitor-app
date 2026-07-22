import { useState } from 'react';
import { BadgeCheck, Crown, Loader2, RotateCcw, Settings2, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { APP_CONFIG } from '@/config/app';
import {
  hasUnlimitedGames,
  isPremium,
  presentCustomerCenter,
  presentSubscriptionPaywall,
  restorePurchases,
  useSubscriptionAccess,
} from '@/lib/premium';
import { toast } from 'sonner';
import { GameSoundSettings } from '@/components/GameSoundSettings';

interface PremiumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PremiumDialog({ open, onOpenChange }: PremiumDialogProps) {
  const access = useSubscriptionAccess();
  const [busy, setBusy] = useState<'buy' | 'restore' | 'manage' | null>(null);

  const handlePaywall = async () => {
    setBusy('buy');
    try {
      await presentSubscriptionPaywall();
      if (hasUnlimitedGames() || isPremium()) onOpenChange(false);
    } catch {
      toast.error('訂閱畫面暫時開唔到，請稍後再試');
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async () => {
    setBusy('restore');
    try {
      const ok = await restorePurchases();
      if (ok) {
        onOpenChange(false);
        toast.success('已恢復你的訂閱');
      } else {
        toast.info('搵唔到之前的訂閱紀錄');
      }
    } catch {
      toast.error('恢復購買失敗，請稍後再試');
    } finally {
      setBusy(null);
    }
  };

  const handleCustomerCenter = async () => {
    setBusy('manage');
    try {
      await presentCustomerCenter();
    } catch {
      toast.error('暫時開唔到訂閱管理');
    } finally {
      setBusy(null);
    }
  };

  const status = access.unlimitedGames
    ? '無限遊戲會員'
    : access.noAds
      ? '無廣告會員'
      : '免費用戶';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-sm overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-amber-500" />
            會員設定
          </DialogTitle>
          <DialogDescription className="pt-1 text-left">
            免費每日可玩 {APP_CONFIG.games.freePlaysPerDay} 次遊戲；會員可移除廣告或解鎖無限遊戲。
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl bg-amber-50 p-4 text-sm text-slate-600">
          <div className="flex items-center gap-2 font-black text-slate-700">
            <BadgeCheck className="h-5 w-5 text-emerald-500" />
            目前狀態：{status}
          </div>
          {access.customerInfo?.latestExpirationDate && (
            <p className="mt-1 text-xs text-slate-500">
              到期日：{new Date(access.customerInfo.latestExpirationDate).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-base font-black text-slate-700">去廣告</p>
            <p className="mt-1 text-sm text-slate-500">
              {APP_CONFIG.premium.noAdsPrice} / {APP_CONFIG.premium.period}，移除底部 AdMob 廣告。
            </p>
          </div>
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
            <p className="flex items-center gap-2 text-base font-black text-slate-700">
              <Crown className="h-5 w-5 text-amber-500" />
              無限遊戲
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {APP_CONFIG.premium.unlimitedPrice} / {APP_CONFIG.premium.period}，包含無廣告同無限玩 Mini Games。
            </p>
          </div>
        </div>

        <Button
          onClick={handlePaywall}
          disabled={busy !== null}
          className="h-12 w-full rounded-2xl bg-amber-400 text-base font-bold text-amber-900 hover:bg-amber-300"
        >
          {busy === 'buy' ? <Loader2 className="h-5 w-5 animate-spin" /> : '查看訂閱方案'}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="ghost"
            onClick={handleRestore}
            disabled={busy !== null}
            className="text-slate-500"
          >
            {busy === 'restore' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            恢復
          </Button>
          <Button
            variant="ghost"
            onClick={handleCustomerCenter}
            disabled={busy !== null}
            className="text-slate-500"
          >
            {busy === 'manage' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />}
            管理
          </Button>
        </div>

        {access.error && (
          <p className="rounded-2xl bg-rose-50 p-3 text-xs text-rose-600">
            RevenueCat：{access.error}
          </p>
        )}

        <p className="text-center text-xs text-slate-400">
          正式上架前請把 Test Store API key 換成 Android / iOS 專用 production public key。
        </p>

        <div className="border-t border-slate-100 pt-4">
          <GameSoundSettings />
        </div>
      </DialogContent>
    </Dialog>
  );
}
