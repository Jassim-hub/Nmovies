import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getReelplexiAppNotifications } from '@/lib/reelplexi';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface DbNotification {
  id: string;
  title: string;
  message: string;
  image_url?: string;
  status: string;
  created_at: string;
}

export default async function NotificationsPage() {
  let dbNotifications: DbNotification[] = [];
  try {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    dbNotifications = data || [];
  } catch (e) {
    console.error('Error fetching database notifications:', e);
  }

  let reelplexiNotifications: any[] = [];
  try {
    reelplexiNotifications = await getReelplexiAppNotifications();
  } catch (e) {
    console.error('Error fetching reelplexi notifications:', e);
  }

  // Combine and sort notifications by created_at desc
  const allNotifications = [...dbNotifications, ...reelplexiNotifications].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="container mx-auto px-4 py-24 min-h-screen">
      <div className="max-w-4xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-white uppercase tracking-wider">Notifications</h1>
        <p className="text-gray-400 text-sm mt-1">Stay updated with the latest releases and announcements</p>
      </div>

      {allNotifications.length === 0 ? (
        <div className="text-center text-gray-500 py-16 bg-[#141414] rounded-2xl border border-gray-800 max-w-4xl mx-auto">
          <p className="text-lg font-semibold">No notifications yet</p>
          <p className="text-sm mt-1 text-gray-600">Check back later for updates on new movies and series</p>
        </div>
      ) : (
        <div className="space-y-4 max-w-4xl mx-auto">
          {allNotifications.map((notif: any) => {
            const linkUrl = notif.content_type && notif.content_id
              ? `/${notif.content_type === 'movie' ? 'movies' : 'series'}/${notif.content_id}`
              : '#';

            return (
              <Link
                href={linkUrl}
                key={notif.id}
                className="bg-[#141414] border border-gray-800 rounded-xl p-5 flex gap-4 hover:border-[#E50914] transition-all group"
              >
                {notif.image_url && (
                  <div className="relative w-20 h-28 flex-shrink-0 bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
                    <Image
                      src={notif.image_url}
                      alt={notif.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-bold text-white group-hover:text-[#E50914] transition-colors truncate">
                      {notif.title}
                    </h2>
                    <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
                      {notif.status === 'sent' ? 'Broadcast' : 'Update'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed">{notif.message}</p>
                  <span className="text-xs text-gray-600 mt-2 block font-medium">
                    {new Date(notif.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })} at {new Date(notif.created_at).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
