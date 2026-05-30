"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

/**
 * RealtimeTest Component
 * 
 * This component helps you test if Realtime subscriptions are working correctly.
 * Add it temporarily to any page to see real-time updates.
 * 
 * Usage:
 * import RealtimeTest from '@/components/RealtimeTest';
 * <RealtimeTest />
 */
export default function RealtimeTest() {
  const { user, isPremium } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [profileData, setProfileData] = useState<any>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[RealtimeTest] ${message}`);
  };

  // Fetch current profile data
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription, subscription_expiry_date')
        .eq('id', user.id)
        .single();

      if (error) {
        addLog(`Error fetching profile: ${error.message}`);
      } else {
        setProfileData(data);
        addLog('Profile data loaded');
      }
    };

    fetchProfile();
  }, [user]);

  // Test realtime subscription
  useEffect(() => {
    if (!user) return;

    addLog(`Setting up Realtime test for user: ${user.id}`);

    const channel = supabase
      .channel(`test-profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          addLog('🎉 Realtime UPDATE received!');
          addLog(`New data: ${JSON.stringify(payload.new)}`);
          setProfileData(payload.new);
        }
      )
      .subscribe((status) => {
        addLog(`Realtime status: ${status}`);
      });

    return () => {
      addLog('Cleaning up Realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-900 border border-gray-700 rounded-lg p-4 max-w-md">
        <h3 className="text-white font-bold mb-2">Realtime Test</h3>
        <p className="text-gray-400 text-sm">Please sign in to test Realtime</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 border border-gray-700 rounded-lg p-4 max-w-md max-h-96 overflow-y-auto shadow-xl z-50">
      <h3 className="text-white font-bold mb-2">🔴 Realtime Test Panel</h3>
      
      <div className="mb-3 p-2 bg-gray-800 rounded text-xs">
        <p className="text-gray-400">User ID: {user.id.substring(0, 8)}...</p>
        <p className="text-gray-400">isPremium: <span className={isPremium ? 'text-green-400' : 'text-red-400'}>{isPremium ? 'YES' : 'NO'}</span></p>
      </div>

      {profileData && (
        <div className="mb-3 p-2 bg-gray-800 rounded text-xs">
          <p className="text-white font-semibold mb-1">Current Profile:</p>
          <p className="text-gray-400">Subscription: {profileData.subscription || 'none'}</p>
          <p className="text-gray-400">Expiry: {profileData.subscription_expiry_date ? new Date(profileData.subscription_expiry_date).toLocaleString() : 'none'}</p>
        </div>
      )}

      <div className="mb-2">
        <p className="text-white font-semibold text-sm mb-1">Activity Log:</p>
        <div className="bg-black rounded p-2 max-h-40 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-xs">No activity yet...</p>
          ) : (
            logs.map((log, idx) => (
              <p key={idx} className="text-green-400 text-xs font-mono mb-1">
                {log}
              </p>
            ))
          )}
        </div>
      </div>

      <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
        <p>💡 To test: Update your subscription in the database and watch for real-time updates here.</p>
      </div>
    </div>
  );
}
