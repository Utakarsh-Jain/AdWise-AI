export type ChannelId = 'google' | 'facebook' | 'tiktok';

export const CHANNELS: { id: ChannelId; label: string; color: string; colorDark: string }[] = [
  { id: 'google', label: 'Google Ads', color: '#18181b', colorDark: '#fafafa' },
  { id: 'facebook', label: 'Facebook / Meta', color: '#52525b', colorDark: '#e4e4e7' },
  { id: 'tiktok', label: 'TikTok', color: '#a1a1aa', colorDark: '#a1a1aa' },
];

export interface ChannelBaseline {
  spend: number;
  conversions: number;
  efficiency: number; // conversions per dollar
}

export type ChannelBaselines = Record<ChannelId, ChannelBaseline>;

export interface PlatformRow {
  platform: string;
  totalSpend: number;
  totalConversions: number;
}

export function normalizeToChannel(platform: string): ChannelId | 'other' {
  const p = platform.toLowerCase();
  if (p.includes('google') || p.includes('gdn') || p.includes('youtube') || p.includes('sem')) {
    return 'google';
  }
  if (
    p.includes('meta') ||
    p.includes('facebook') ||
    p.includes('instagram') ||
    p.includes('fb') ||
    p.includes('ig')
  ) {
    return 'facebook';
  }
  if (p.includes('tiktok') || p.includes('tt')) {
    return 'tiktok';
  }
  return 'other';
}

export function buildChannelBaselines(platforms: PlatformRow[]): ChannelBaselines {
  const baselines: ChannelBaselines = {
    google: { spend: 0, conversions: 0, efficiency: 0 },
    facebook: { spend: 0, conversions: 0, efficiency: 0 },
    tiktok: { spend: 0, conversions: 0, efficiency: 0 },
  };

  platforms.forEach((p) => {
    const channel = normalizeToChannel(p.platform);
    if (channel === 'other') {
      // Fold unknown platforms into the highest-spend bucket for simulation
      const target: ChannelId =
        baselines.google.spend >= baselines.facebook.spend && baselines.google.spend >= baselines.tiktok.spend
          ? 'google'
          : baselines.facebook.spend >= baselines.tiktok.spend
            ? 'facebook'
            : 'tiktok';
      baselines[target].spend += p.totalSpend;
      baselines[target].conversions += p.totalConversions;
      return;
    }
    baselines[channel].spend += p.totalSpend;
    baselines[channel].conversions += p.totalConversions;
  });

  (Object.keys(baselines) as ChannelId[]).forEach((id) => {
    const b = baselines[id];
    b.efficiency = b.spend > 0 ? b.conversions / b.spend : 0;
  });

  return baselines;
}

export function sharesFromBaselines(baselines: ChannelBaselines): Record<ChannelId, number> {
  const total = baselines.google.spend + baselines.facebook.spend + baselines.tiktok.spend;
  if (total <= 0) {
    return { google: 34, facebook: 33, tiktok: 33 };
  }
  return {
    google: (baselines.google.spend / total) * 100,
    facebook: (baselines.facebook.spend / total) * 100,
    tiktok: (baselines.tiktok.spend / total) * 100,
  };
}

export function adjustShares(
  shares: Record<ChannelId, number>,
  changed: ChannelId,
  newValue: number
): Record<ChannelId, number> {
  const clamped = Math.max(5, Math.min(90, newValue));
  const others = CHANNELS.map((c) => c.id).filter((id) => id !== changed);
  const delta = clamped - shares[changed];
  const otherTotal = others.reduce((sum, id) => sum + shares[id], 0);

  const next: Record<ChannelId, number> = { ...shares, [changed]: clamped };

  if (otherTotal <= 0) {
    const each = (100 - clamped) / others.length;
    others.forEach((id) => {
      next[id] = each;
    });
    return next;
  }

  others.forEach((id) => {
    const weight = shares[id] / otherTotal;
    next[id] = Math.max(5, shares[id] - delta * weight);
  });

  const sum = next.google + next.facebook + next.tiktok;
  (Object.keys(next) as ChannelId[]).forEach((id) => {
    next[id] = (next[id] / sum) * 100;
  });

  return next;
}

export interface SimulationMetrics {
  totalSpend: number;
  totalConversions: number;
  cpa: number;
  roi: number;
  channelSpend: Record<ChannelId, number>;
  channelConversions: Record<ChannelId, number>;
}

export function simulateAllocation(
  baselines: ChannelBaselines,
  shares: Record<ChannelId, number>,
  conversionValue: number
): SimulationMetrics {
  const totalSpend =
    baselines.google.spend + baselines.facebook.spend + baselines.tiktok.spend;

  const channelSpend = {
    google: (totalSpend * shares.google) / 100,
    facebook: (totalSpend * shares.facebook) / 100,
    tiktok: (totalSpend * shares.tiktok) / 100,
  };

  const channelConversions = {
    google: channelSpend.google * baselines.google.efficiency,
    facebook: channelSpend.facebook * baselines.facebook.efficiency,
    tiktok: channelSpend.tiktok * baselines.tiktok.efficiency,
  };

  const totalConversions =
    channelConversions.google + channelConversions.facebook + channelConversions.tiktok;

  const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const revenue = totalConversions * conversionValue;
  const roi = totalSpend > 0 ? ((revenue - totalSpend) / totalSpend) * 100 : 0;

  return {
    totalSpend,
    totalConversions,
    cpa,
    roi,
    channelSpend,
    channelConversions,
  };
}

export function baselineMetrics(
  baselines: ChannelBaselines,
  conversionValue: number
): SimulationMetrics {
  const shares = sharesFromBaselines(baselines);
  return simulateAllocation(baselines, shares, conversionValue);
}
