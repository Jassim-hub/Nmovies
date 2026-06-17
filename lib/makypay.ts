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
   * MakyPay officially supported prefixes:
   * MTN: 077, 078, 076, 039
   * Airtel: 070, 074, 075
   */
  static getProviderFromPhone(phoneNumber: string): string {
    const formatted = this.formatPhoneNumber(phoneNumber);

    // MTN: 256 + (077, 078, 076, 039) — per MakyPay API docs
    if (/^256(77|78|76|39)/.test(formatted)) {
      return 'mtn';
    }

    // Airtel: 256 + (070, 074, 075) — per MakyPay API docs
    if (/^256(70|74|75)/.test(formatted)) {
      return 'airtel';
    }

    // Reject unsupported prefixes instead of silently defaulting
    const prefix = formatted.substring(3, 5);
    throw new MakyPayException(
      `Unsupported phone prefix (0${prefix}). MakyPay supports MTN (077/078/076/039) and Airtel (070/074/075) only.`
    );
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
   * Extract a human-readable error message from a MakyPay API response.
   * Checks multiple possible fields since error format may vary.
   */
  private static extractErrorMessage(data: any, httpStatus: number): string {
    return (
      data?.message ||
      data?.error ||
      data?.data?.message ||
      (Array.isArray(data?.errors) ? data.errors.join('; ') : null) ||
      (typeof data?.errors === 'string' ? data.errors : null) ||
      `API request failed with status ${httpStatus}`
    );
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

      // Ensure amount is an integer (MakyPay expects whole UGX)
      const intAmount = Math.round(amount);

      // Prepare form data (per MakyPay API docs: application/x-www-form-urlencoded)
      const formData = new URLSearchParams();
      formData.append('phone_number', formattedPhone);
      formData.append('amount', intAmount.toString());
      formData.append('country', 'UG');
      formData.append('reference', uniqueReference);
      formData.append('description', description.substring(0, 255)); // Max 255 chars

      if (callbackUrl) {
        formData.append('callback_url', callbackUrl);
      }

      console.log('MakyPay Collection Request:', {
        phone: formattedPhone,
        amount: intAmount,
        provider,
        reference: uniqueReference,
        body: formData.toString(),
      });

      const response = await fetch(`${this.BASE_URL}/collections/collect-money`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      let data: any;
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error('MakyPay returned non-JSON response:', responseText.substring(0, 500));
        throw new MakyPayException(`MakyPay returned invalid response (HTTP ${response.status})`);
      }

      console.log('MakyPay Collection Response:', JSON.stringify(data, null, 2));

      if (!response.ok || data.status !== 'success') {
        const errorMsg = this.extractErrorMessage(data, response.status);
        console.error('MakyPay Collection FAILED:', {
          httpStatus: response.status,
          fullResponse: JSON.stringify(data),
          extractedError: errorMsg,
        });
        throw new MakyPayException(errorMsg);
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
      const intAmount = Math.round(amount);

      const formData = new URLSearchParams();
      formData.append('method', 'card');
      formData.append('amount', intAmount.toString());
      formData.append('country', 'UG');
      formData.append('reference', uniqueReference);
      formData.append('description', description.substring(0, 255));

      if (callbackUrl) {
        formData.append('callback_url', callbackUrl);
      }

      console.log('MakyPay Card Collection Request:', {
        amount: intAmount,
        reference: uniqueReference,
        body: formData.toString(),
      });

      const response = await fetch(`${this.BASE_URL}/collections/collect-money`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      let data: any;
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error('MakyPay Card returned non-JSON:', responseText.substring(0, 500));
        throw new MakyPayException(`MakyPay returned invalid response (HTTP ${response.status})`);
      }

      console.log('MakyPay Card Collection Response:', JSON.stringify(data, null, 2));

      if (!response.ok || data.status !== 'success') {
        const errorMsg = this.extractErrorMessage(data, response.status);
        console.error('MakyPay Card Collection FAILED:', {
          httpStatus: response.status,
          fullResponse: JSON.stringify(data),
          extractedError: errorMsg,
        });
        throw new MakyPayException(errorMsg);
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

      // Require service-role client — anon client cannot bypass profiles RLS
      if (!supabaseAdmin) {
        throw new MakyPayException(
          'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set. Cannot activate subscription.'
        );
      }

      // Check if payment was successful
      const result = await this.checkTransactionStatus(transactionId);

      if (result.isCompleted) {
        // Update user subscription in Supabase
        const now = new Date();
        const expiryDate = new Date(now.getTime() + subscriptionDuration * 24 * 60 * 60 * 1000);

        // Update user profile with subscription details FIRST
        // This is the critical write — all access checks read from profiles
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription: subscriptionPlan,
            subscription_start_date: now.toISOString(),
            subscription_expiry_date: expiryDate.toISOString(),
          })
          .eq('id', userId);

        if (profileError) {
          console.error('CRITICAL: Failed to update profile subscription:', profileError);
          throw new MakyPayException(
            'Failed to activate subscription. Please contact support with your transaction reference.'
          );
        }

        // Insert subscription record (payment ledger — non-critical)
        const { error: subscriptionError } = await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: userId,
            plan: subscriptionPlan,
            payment_method: 'makypay_mobile_money',
            subscribed_at: now,
          });

        if (subscriptionError) {
          // Log but don't fail — profile is already updated, user has access
          console.error('Non-critical: Failed to insert subscription record:', subscriptionError);
        }

        // Mark transaction as completed in our database
        await this.updateTransactionStatus(transactionId, 'completed', null);

        console.log('Subscription activated successfully for user:', userId);
      } else {
        throw new MakyPayException(`Payment not completed. Status: ${result.status}`);
      }
    } catch (e) {
      if (e instanceof MakyPayException) throw e;
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
      if (!supabaseAdmin) {
        console.warn('storeTransaction: supabaseAdmin not available, transaction record may not be stored due to RLS');
      }
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
      if (!supabaseAdmin) {
        console.warn('storeCardTransaction: supabaseAdmin not available, transaction record may not be stored due to RLS');
      }
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

      if (!supabaseAdmin) {
        console.warn('updateTransactionStatus: supabaseAdmin not available, status update may fail due to RLS');
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
