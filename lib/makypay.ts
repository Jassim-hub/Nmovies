import { supabase } from './supabase';
import { supabaseAdmin } from './supabase-admin';

/**
 * MakyPay Standard API Integration
 * Complete guide to integrating with the MakyPay domestic payment platform.
 * Process collections and disbursements via Mobile Money in Uganda.
 * 
 * Supports:
 * - MTN Mobile Money (077, 078, 076, 039, 031, 079)
 * - Airtel Money (070, 073, 074, 075)
 * - Card Payments (Visa/Mastercard)
 */
export class MakyPayService {
  private static readonly BASE_URL = 'https://wire-api.makylegacy.com/api/v1';

  // API Credentials - Store these in environment variables
  private static readonly API_KEY = process.env.MAKYPAY_API_KEY || '';
  private static readonly API_SECRET = process.env.MAKYPAY_API_SECRET || '';
  private static readonly BASE64_AUTH = process.env.MAKYPAY_BASE64_AUTH || '';

  /**
   * Get Authorization header
   * Uses pre-encoded Base64 header if available, otherwise encodes API_KEY:API_SECRET
   */
  private static getAuthHeader(): string {
    if (this.BASE64_AUTH) {
      return `Basic ${this.BASE64_AUTH}`;
    }
    
    if (this.API_KEY && this.API_SECRET) {
      const credentials = Buffer.from(`${this.API_KEY}:${this.API_SECRET}`).toString('base64');
      return `Basic ${credentials}`;
    }
    
    throw new MakyPayException('MakyPay API credentials not configured');
  }

  /**
   * Supported Mobile Network Operators in Uganda
   */
  private static readonly SUPPORTED_MNOS = {
    'mtn': 'MTN Mobile Money',
    'airtel': 'Airtel Money',
  };

  /**
   * Get supported Mobile Network Operators
   */
  static getSupportedMnos(): Array<{code: string, name: string}> {
    return Object.entries(this.SUPPORTED_MNOS).map(([code, name]) => ({
      code,
      name
    }));
  }

  /**
   * Validate and format phone number for Uganda
   * Format: 256XXXXXXXXX (12 digits total)
   */
  static formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    phoneNumber = phoneNumber.replace(/\D/g, '');

    // Ensure Uganda country code (256)
    const countryCode = '256';

    if (!phoneNumber.startsWith(countryCode)) {
      // Remove leading zero if present
      if (phoneNumber.startsWith('0')) {
        phoneNumber = phoneNumber.substring(1);
      }
      phoneNumber = countryCode + phoneNumber;
    }

    // Validate length (256 + 9 digits = 12 total)
    if (phoneNumber.length !== 12) {
      throw new MakyPayException('Invalid phone number format. Expected 12 digits (256XXXXXXXXX)');
    }

    return phoneNumber;
  }

  /**
   * Determine mobile money provider based on phone number prefix
   * 
   * MTN Prefixes (as of March 2025):
   * - 077, 078, 076, 039, 031, 079 (newly added March 2025)
   * 
   * Airtel Prefixes:
   * - 070, 073, 074, 075
   */
  static getProviderFromPhone(phoneNumber: string): string {
    const formatted = this.formatPhoneNumber(phoneNumber);

    // MTN: 256 + (077, 078, 076, 039, 031, 079)
    if (/^256(77|78|76|39|31|79)/.test(formatted)) {
      return 'mtn';
    }

    // Airtel: 256 + (070, 073, 074, 075)
    if (/^256(70|73|74|75)/.test(formatted)) {
      return 'airtel';
    }

    // Default to MTN if unknown
    return 'mtn';
  }

  /**
   * Get account balance
   */
  static async getBalance(): Promise<MakyPayBalanceResponse> {
    try {
      const response = await fetch(`${this.BASE_URL}/wallet/balance`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new MakyPayException(
          data.message || `HTTP Error: ${response.status} - ${response.statusText}`
        );
      }

      return data;
    } catch (e) {
      if (e instanceof MakyPayException) throw e;
      throw new MakyPayException(`Failed to get balance: ${e}`);
    }
  }

  /**
   * Initiate mobile money collection
   */
  static async collectMobileMoney(params: {
    userId: string;
    phoneNumber: string;
    amount: number;
    description: string;
    reference?: string;
    callbackUrl?: string;
  }): Promise<MakyPayCollectionResult> {
    try {
      const { userId, phoneNumber, amount, description, reference, callbackUrl } = params;

      // Validate amount (500 - 10,000,000 UGX)
      if (amount < 500 || amount > 10000000) {
        throw new MakyPayException('Amount must be between 500 and 10,000,000 UGX');
      }

      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      const provider = this.getProviderFromPhone(formattedPhone);
      
      // Generate UUID v4 reference if not provided
      const uniqueReference = reference || this.generateUUID();

      // Prepare form data
      const formData = new URLSearchParams();
      formData.append('phone_number', formattedPhone);
      formData.append('amount', amount.toString());
      formData.append('country', 'UG');
      formData.append('reference', uniqueReference);
      formData.append('description', description.substring(0, 255)); // Max 255 chars

      if (callbackUrl) {
        formData.append('callback_url', callbackUrl);
      }

      console.log('MakyPay Collection Request:', {
        phone: formattedPhone,
        amount,
        reference: uniqueReference,
      });

      const response = await fetch(`${this.BASE_URL}/collections/collect-money`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = await response.json();
      console.log('MakyPay Collection Response:', data);

      if (!response.ok || data.status !== 'success') {
        throw new MakyPayException(
          data.message || `Collection failed: ${response.status}`
        );
      }

      const result: MakyPayCollectionResult = {
        uuid: data.data.transaction.uuid,
        reference: data.data.transaction.reference,
        status: data.data.transaction.status,
        amount: data.data.collection.amount.raw,
        currency: data.data.collection.amount.currency,
        provider: data.data.collection.provider,
        phoneNumber: data.data.collection.phone_number,
        description,
        isCompleted: data.data.transaction.status === 'completed',
        isFailed: data.data.transaction.status === 'failed',
        isPending: data.data.transaction.status === 'processing',
        displayStatus: this.getDisplayStatus(data.data.transaction.status),
      };

      // Store transaction in database
      await this.storeTransaction(userId, result);

      return result;
    } catch (e) {
      if (e instanceof MakyPayException) throw e;
      throw new MakyPayException(`Failed to initiate collection: ${e}`);
    }
  }

  /**
   * Initiate card payment collection
   */
  static async collectCardPayment(params: {
    userId: string;
    amount: number;
    description: string;
    reference?: string;
    callbackUrl?: string;
  }): Promise<MakyPayCardCollectionResult> {
    try {
      const { userId, amount, description, reference, callbackUrl } = params;

      // Validate amount
      if (amount < 500 || amount > 10000000) {
        throw new MakyPayException('Amount must be between 500 and 10,000,000 UGX');
      }

      const uniqueReference = reference || this.generateUUID();

      const formData = new URLSearchParams();
      formData.append('method', 'card');
      formData.append('amount', amount.toString());
      formData.append('country', 'UG');
      formData.append('reference', uniqueReference);
      formData.append('description', description.substring(0, 255));

      if (callbackUrl) {
        formData.append('callback_url', callbackUrl);
      }

      const response = await fetch(`${this.BASE_URL}/collections/collect-money`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = await response.json();

      if (!response.ok || data.status !== 'success') {
        throw new MakyPayException(
          data.message || `Card collection failed: ${response.status}`
        );
      }

      const result: MakyPayCardCollectionResult = {
        uuid: data.data.transaction.uuid,
        reference: data.data.transaction.reference,
        status: data.data.transaction.status,
        amount: data.data.collection.amount.raw,
        currency: data.data.collection.amount.currency,
        provider: data.data.collection.provider,
        redirectUrl: data.data.redirect_url,
        description,
        isCompleted: data.data.transaction.status === 'completed',
        isFailed: data.data.transaction.status === 'failed',
        isPending: data.data.transaction.status === 'processing',
        displayStatus: this.getDisplayStatus(data.data.transaction.status),
      };

      // Store transaction in database
      await this.storeCardTransaction(userId, result);

      return result;
    } catch (e) {
      if (e instanceof MakyPayException) throw e;
      throw new MakyPayException(`Failed to initiate card payment: ${e}`);
    }
  }

  /**
   * Check transaction status
   */
  static async checkTransactionStatus(transactionId: string): Promise<MakyPayTransactionStatus> {
    try {
      const response = await fetch(`${this.BASE_URL}/transactions/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new MakyPayException(
          data.message || `Failed to check status: ${response.status}`
        );
      }

      return {
        uuid: data.data.transaction.uuid,
        reference: data.data.transaction.reference,
        status: data.data.transaction.status,
        amount: data.data.transaction.amount?.raw || 0,
        currency: data.data.transaction.amount?.currency || 'UGX',
        provider: data.data.transaction.provider,
        providerReference: data.data.transaction.provider_reference,
        isCompleted: data.data.transaction.status === 'completed',
        isFailed: data.data.transaction.status === 'failed',
        isPending: data.data.transaction.status === 'processing',
        displayStatus: this.getDisplayStatus(data.data.transaction.status),
      };
    } catch (e) {
      if (e instanceof MakyPayException) throw e;
      throw new MakyPayException(`Failed to check transaction status: ${e}`);
    }
  }

  /**
   * Poll for transaction completion with exponential backoff
   */
  static async waitForTransactionCompletion(params: {
    transactionId: string;
    backoffSeconds?: number[];
    maxAttempts?: number;
  }): Promise<MakyPayTransactionStatus> {
    const {
      transactionId,
      backoffSeconds = [2, 5, 10, 20, 30, 60],
      maxAttempts = 10
    } = params;

    let lastResult: MakyPayTransactionStatus | null = null;
    let attempts = 0;

    for (const seconds of backoffSeconds) {
      if (attempts >= maxAttempts) break;

      await new Promise(resolve => setTimeout(resolve, seconds * 1000));
      attempts++;

      try {
        lastResult = await this.checkTransactionStatus(transactionId);

        // Update database with latest status
        await this.updateTransactionStatus(
          transactionId,
          lastResult.status,
          null
        );

        // Check if transaction is complete
        if (lastResult.isCompleted || lastResult.isFailed) {
          return lastResult;
        }
      } catch (e) {
        console.error('Error checking transaction status:', e);
        // Continue polling on errors
      }
    }

    // Return last result or timeout status
    if (lastResult) {
      return lastResult;
    }

    throw new MakyPayException('Transaction timeout - status check failed');
  }

  /**
   * Complete subscription after successful payment
   */
  static async completeSubscriptionPayment(params: {
    userId: string;
    transactionId: string;
    subscriptionPlan: string;
    subscriptionDuration: number; // in days
  }): Promise<void> {
    try {
      const { userId, transactionId, subscriptionPlan, subscriptionDuration } = params;

      // Check if payment was successful
      const result = await this.checkTransactionStatus(transactionId);

      if (result.isCompleted) {
        // Update user subscription in Supabase
        const now = new Date();
        const expiryDate = new Date(now.getTime() + subscriptionDuration * 24 * 60 * 60 * 1000);

        // Insert subscription record
        // Use service-role client to bypass RLS
        const dbClient = supabaseAdmin || supabase;
        const { error: subscriptionError } = await dbClient
          .from('subscriptions')
          .insert({
            user_id: userId,
            plan: subscriptionPlan,
            payment_method: 'makypay_mobile_money',
            subscribed_at: now,
          });

        if (subscriptionError) {
          console.error('Error updating subscription:', subscriptionError);
          throw new MakyPayException('Failed to update subscription');
        }

        // Update user profile with subscription details
        // MUST use service-role client: profiles UPDATE RLS requires auth.uid() = id,
        // which is NULL on the server side (no user session attached to this client)
        const { error: profileError } = await dbClient
          .from('profiles')
          .update({
            subscription: subscriptionPlan,
            subscription_start_date: now.toISOString(),
            subscription_expiry_date: expiryDate.toISOString(),
          })
          .eq('id', userId);

        if (profileError) {
          console.error('Error updating profile:', profileError);
          // Don't throw here as subscription was updated
        }

        // Mark transaction as completed in our database
        await this.updateTransactionStatus(transactionId, 'completed', null);

        console.log('Subscription activated successfully for user:', userId);
      } else {
        throw new MakyPayException(`Payment not completed. Status: ${result.status}`);
      }
    } catch (e) {
      throw new MakyPayException(`Failed to complete subscription: ${e}`);
    }
  }

  /**
   * Store transaction in Supabase database
   */
  private static async storeTransaction(
    userId: string,
    result: MakyPayCollectionResult
  ): Promise<void> {
    try {
      const dbClient = supabaseAdmin || supabase;
      const { error } = await dbClient
        .from('makypay_transactions')
        .insert({
          user_id: userId,
          uuid: result.uuid,
          reference: result.reference,
          amount: result.amount,
          currency: result.currency,
          phone_number: result.phoneNumber,
          provider: result.provider,
          status: result.status,
          description: result.description,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to store transaction:', error);
        // Don't throw here as this shouldn't fail the main payment flow
      }
    } catch (e) {
      console.error('Failed to store transaction:', e);
    }
  }

  /**
   * Store card transaction in database
   */
  private static async storeCardTransaction(
    userId: string,
    result: MakyPayCardCollectionResult
  ): Promise<void> {
    try {
      const dbClient = supabaseAdmin || supabase;
      const { error } = await dbClient
        .from('makypay_transactions')
        .insert({
          user_id: userId,
          uuid: result.uuid,
          reference: result.reference,
          amount: result.amount,
          currency: result.currency,
          provider: result.provider,
          status: result.status,
          description: result.description,
          redirect_url: result.redirectUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to store card transaction:', error);
      }
    } catch (e) {
      console.error('Failed to store card transaction:', e);
    }
  }

  /**
   * Update transaction status in database
   */
  private static async updateTransactionStatus(
    transactionId: string,
    status: string,
    errorMessage: string | null
  ): Promise<void> {
    try {
      const updateData: Record<string, any> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (errorMessage) {
        updateData.error_message = errorMessage;
      }

      const dbClient = supabaseAdmin || supabase;
      const { error } = await dbClient
        .from('makypay_transactions')
        .update(updateData)
        .eq('uuid', transactionId);

      if (error) {
        console.error('Failed to update transaction status:', error);
      }
    } catch (e) {
      console.error('Failed to update transaction status:', e);
    }
  }

  /**
   * Get transaction history for a user
   */
  static async getTransactionHistory(userId: string): Promise<MakyPayTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('makypay_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to get transaction history:', error);
        return [];
      }

      return data || [];
    } catch (e) {
      console.error('Failed to get transaction history:', e);
      return [];
    }
  }

  /**
   * Generate UUID v4
   */
  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Get display status
   */
  private static getDisplayStatus(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'succeeded':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'processing':
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  }
}

/**
 * Types for MakyPay API
 */
export interface MakyPayBalanceResponse {
  status: string;
  data: {
    balance: {
      formatted: string;
      raw: number;
      currency: string;
    };
  };
}

export interface MakyPayCollectionResult {
  uuid: string;
  reference: string;
  status: string;
  amount: number;
  currency: string;
  provider: string;
  phoneNumber: string;
  description: string;
  isCompleted: boolean;
  isFailed: boolean;
  isPending: boolean;
  displayStatus: string;
}

export interface MakyPayCardCollectionResult {
  uuid: string;
  reference: string;
  status: string;
  amount: number;
  currency: string;
  provider: string;
  redirectUrl: string;
  description: string;
  isCompleted: boolean;
  isFailed: boolean;
  isPending: boolean;
  displayStatus: string;
}

export interface MakyPayTransactionStatus {
  uuid: string;
  reference: string;
  status: string;
  amount: number;
  currency: string;
  provider: string;
  providerReference?: string;
  isCompleted: boolean;
  isFailed: boolean;
  isPending: boolean;
  displayStatus: string;
}

export interface MakyPayTransaction {
  id: string;
  user_id: string;
  uuid: string;
  reference: string;
  amount: number;
  currency: string;
  phone_number?: string;
  provider: string;
  status: string;
  description: string;
  redirect_url?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Exception class for MakyPay operations
 */
export class MakyPayException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MakyPayException';
  }
}
