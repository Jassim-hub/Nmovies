/**
 * Payment Gateway Configuration
 * 
 * This file controls which payment providers are enabled in the application.
 * Set to true to enable, false to disable.
 * 
 * When a provider is disabled:
 * - It will not appear in the UI
 * - API routes will still exist but return disabled message
 * - Code remains intact for future use
 */

export const PAYMENT_CONFIG = {
  /**
   * YoPayments - Mobile Money (MTN & Airtel)
   * Set to false to disable YoPayments throughout the application
   */
  YOPAYMENTS_ENABLED: false,

  /**
   * MakyPay - Mobile Money (MTN & Airtel) + Card Payments
   * Set to false to disable MakyPay throughout the application
   */
  MAKYPAY_ENABLED: true,
} as const;

/**
 * Helper functions to check payment provider availability
 */
export const PaymentProviders = {
  /**
   * Check if YoPayments is enabled
   */
  isYoPaymentsEnabled: (): boolean => {
    return PAYMENT_CONFIG.YOPAYMENTS_ENABLED;
  },

  /**
   * Check if MakyPay is enabled
   */
  isMakyPayEnabled: (): boolean => {
    return PAYMENT_CONFIG.MAKYPAY_ENABLED;
  },

  /**
   * Get list of enabled payment providers
   */
  getEnabledProviders: (): string[] => {
    const providers: string[] = [];
    if (PAYMENT_CONFIG.YOPAYMENTS_ENABLED) providers.push('yopayments');
    if (PAYMENT_CONFIG.MAKYPAY_ENABLED) providers.push('makypay');
    return providers;
  },

  /**
   * Check if any payment provider is enabled
   */
  hasAnyProvider: (): boolean => {
    return PAYMENT_CONFIG.YOPAYMENTS_ENABLED || PAYMENT_CONFIG.MAKYPAY_ENABLED;
  },

  /**
   * Get the default/primary payment provider
   */
  getDefaultProvider: (): 'yopayments' | 'makypay' | null => {
    if (PAYMENT_CONFIG.MAKYPAY_ENABLED) return 'makypay';
    if (PAYMENT_CONFIG.YOPAYMENTS_ENABLED) return 'yopayments';
    return null;
  },
};

/**
 * Type definitions for payment providers
 */
export type PaymentProvider = 'yopayments' | 'makypay';

export type PaymentProviderConfig = {
  enabled: boolean;
  name: string;
  description: string;
  supportsMobileMoney: boolean;
  supportsCards: boolean;
};

/**
 * Get configuration for a specific payment provider
 */
export const getProviderConfig = (provider: PaymentProvider): PaymentProviderConfig => {
  const configs: Record<PaymentProvider, PaymentProviderConfig> = {
    yopayments: {
      enabled: PAYMENT_CONFIG.YOPAYMENTS_ENABLED,
      name: 'YoPayments',
      description: 'Mobile Money (MTN & Airtel)',
      supportsMobileMoney: true,
      supportsCards: false,
    },
    makypay: {
      enabled: PAYMENT_CONFIG.MAKYPAY_ENABLED,
      name: 'MakyPay',
      description: 'Mobile Money (MTN & Airtel) + Card Payments',
      supportsMobileMoney: true,
      supportsCards: true,
    },
  };

  return configs[provider];
};
