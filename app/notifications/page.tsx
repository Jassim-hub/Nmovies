import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getReelplexiAppNotifications } from '@/lib/reelplexi';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const notifications = await getReelplexiAppNotifications();

  return (
    <div className="container mx-auto px-4 py-24">
      <h1 className="text-3xl font-bold mb-8">Notifications</h1>

      {notifications.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-4 max-w-4xl mx-auto">
          {notifications.map((notif: any) => {
            const linkUrl = notif.content_type && notif.content_id
              ? `/${notif.content_type === 'movie' ? 'movies' : 'series'}/${notif.content_id}`
              : '#';

            return (
              <Link
                href={linkUrl}
                key={notif.id}
                className="bg-[#1f1f1f] border border-gray-800 rounded-lg p-4 flex gap-4 hover:bg-[#2a2a2a] transition-colors"
              >
                {notif.image_url && (
                  <div className="relative w-24 h-36 flex-shrink-0 bg-gray-900 rounded overflow-hidden">
                    <Image
                      src={notif.image_url}
                      alt={notif.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-center">
                  <h2 className="text-xl font-semibold text-white mb-2">{notif.title}</h2>
                  <p className="text-gray-400 line-clamp-3">{notif.message}</p>
                  <span className="text-xs text-gray-500 mt-3 block">
                    {new Date(notif.created_at).toLocaleDateString()} {new Date(notif.created_at).toLocaleTimeString()}
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
