export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  notifications_enabled: boolean;
  favorite_vjs: string[] | null;
  favorite_genres: string[] | null;
  favorite_actors: string[] | null;
  subscription: string | null;
  subscription_start_date: string | null;
  subscription_expiry_date: string | null;
}

export interface Subscription {
  id: number;
  user_id: string;
  plan: string;
  payment_method: string;
  subscribed_at: string;
}

export interface SubscriptionWithProfile {
  id: number;
  user_id: string;
  plan: string;
  payment_method: string;
  subscribed_at: string;
  profile: {
    email: string | null;
    name: string | null;
    subscription_expiry_date: string | null;
  };
}