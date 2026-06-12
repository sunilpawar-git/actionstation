/**
 * Storage Guard — Pre-upload tier limit check (imperative, non-React).
 */
import { strings } from '@/shared/localization/strings';
import { getLimitsForTier } from '../types/tierLimits';
import { subscriptionService } from './subscriptionService';
import { getStorageUsageMb } from './storageUsageService';

const BYTES_PER_MB = 1024 * 1024;

/** Throws localized error when upload would exceed the user's storage cap. */
export async function assertStorageWithinLimit(
    userId: string,
    additionalBytes: number,
): Promise<void> {
    const [subscription, usageMb] = await Promise.all([
        subscriptionService.getSubscription(userId),
        getStorageUsageMb(userId),
    ]);
    const maxMb = getLimitsForTier(subscription.tier).maxStorageMb;
    const additionalMb = additionalBytes / BYTES_PER_MB;
    if (usageMb + additionalMb > maxMb) {
        throw new Error(strings.subscription.limits.storageLimit);
    }
}
