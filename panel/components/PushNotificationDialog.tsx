'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PushNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentTitle?: string;
  contentImage?: string;
  contentType?: 'movie' | 'series';
  contentId?: string;
}

export default function PushNotificationDialog({
  open,
  onOpenChange,
  contentTitle,
  contentImage,
  contentType,
  contentId,
}: PushNotificationDialogProps) {
  const [title, setTitle] = useState(contentTitle ? `New ${contentType}: ${contentTitle}` : '');
  const [message, setMessage] = useState(contentTitle ? `Check out the new ${contentType} "${contentTitle}" now available on NicholMovies!` : '');
  const [targetType, setTargetType] = useState<'all' | 'segments'>('all');
  const [segments, setSegments] = useState<string[]>(['Subscribers']);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({ show: false, type: 'success', title: '', message: '' });

  // Auto-prefill form when dialog opens with movie/series data
  useEffect(() => {
    if (open && contentTitle && contentType) {
      setTitle(`New ${contentType}: ${contentTitle}`);
      setMessage(`Check out the new ${contentType} "${contentTitle}" now available on NicholMovies!`);
    }
  }, [open, contentTitle, contentType]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setNotification({
        show: true,
        type: 'error',
        title: '⚠️ Validation Error',
        message: 'Please fill in both title and message fields'
      });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        imageUrl: contentImage,
        data: {
          type: contentType,
          id: contentId,
          title: contentTitle,
        },
        targetType,
        targetSegments: targetType === 'segments' ? segments : ['Subscribers'],
      };

      const response = await fetch('/panel/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        // Save to database so it appears in the website notifications inbox
        const { error: dbError } = await supabase.from('notifications').insert([{
          title: title.trim(),
          message: message.trim(),
          image_url: contentImage || null,
          status: 'sent'
        }]);

        if (dbError) {
          console.error('Failed to save notification to database:', dbError);
        }

        // Extract useful info from OneSignal response
        const onesignalData = result.data || {};
        const recipients = onesignalData.recipients ?? 1;
        const notificationId = onesignalData.id || 'Sent';
        
        const successMessage = `📱 Push notification delivered! Recipients: ${recipients} | ID: ${notificationId}`;
        
        setNotification({
          show: true,
          type: 'success',
          title: '🎉 Push notification sent successfully!',
          message: successMessage
        });
        
        // Close modal immediately so user can see the success notification
        onOpenChange(false);
        
        // Auto-hide success notification after 5 seconds
        setTimeout(() => {
          setNotification(prev => ({ ...prev, show: false }));
        }, 5000);

        // Reset form
        setTitle(contentTitle ? `New ${contentType}: ${contentTitle}` : '');
        setMessage(contentTitle ? `Check out the new ${contentType} "${contentTitle}" now available on NicholMovies!` : '');
        setTargetType('all');
        setSegments(['Subscribers']);
      } else {
        setNotification({
          show: true,
          type: 'error',
          title: '❌ Failed to send notification',
          message: result.details || result.error || 'Unknown error occurred'
        });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      setNotification({
        show: true,
        type: 'error',
        title: '❌ Network Error',
        message: 'Failed to send notification. Please check your connection and try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-4 max-w-md bg-[#1a1c21] border border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white font-bold uppercase tracking-wider">Send Push Notification</DialogTitle>
          <DialogDescription className="sr-only">Send a push notification to website users</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
              Notification Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notification title..."
              className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">{title.length}/100 characters</p>
          </div>

          {/* Message Input */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
              Notification Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter notification message..."
              rows={3}
              className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] resize-none"
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">{message.length}/200 characters</p>
          </div>

          {/* Target Type */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
              Send To
            </label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as 'all' | 'segments')}
              className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#E50914]"
            >
              <option value="all">All Subscribers</option>
              <option value="segments">Specific Segments</option>
            </select>
          </div>

          {/* Segments Selection (only if targetType is 'segments') */}
          {targetType === 'segments' && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Target Segments
              </label>
              <div className="space-y-2">
                {['Subscribers', 'Active Users', 'Premium Users', 'New Users'].map((segment) => (
                  <label key={segment} className="flex items-center space-x-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={segments.includes(segment)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSegments([...segments, segment]);
                        } else {
                          setSegments(segments.filter(s => s !== segment));
                        }
                      }}
                      className="accent-[#E50914]"
                    />
                    <span>{segment}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {contentImage && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                Notification Preview
              </label>
              <div className="border border-gray-800 rounded p-3 bg-black">
                <div className="flex items-start space-x-3">
                  <Image
                    src={contentImage}
                    alt="Preview"
                    width={48}
                    height={48}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{title}</p>
                    <p className="text-xs text-gray-400 line-clamp-2">{message}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t border-gray-800">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="w-full sm:w-auto bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase font-bold"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            className="w-full sm:w-auto bg-[#E50914] hover:bg-[#b80710] text-white uppercase font-bold shadow-[0_0_10px_rgba(229,9,20,0.3)]"
            disabled={isLoading || !title.trim() || !message.trim()}
          >
            {isLoading ? 'Sending...' : 'Send Notification'}
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* In-App Notification */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className={`p-4 rounded-lg shadow-lg border-l-4 ${
            notification.type === 'success' 
              ? 'bg-green-950 border-green-500 text-green-200' 
              : 'bg-red-950 border-red-500 text-red-200'
          }`}>
            <div className="flex items-start">
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">
                  {notification.title}
                </h4>
                <p className="text-sm whitespace-pre-line">
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => setNotification(prev => ({ ...prev, show: false }))}
                className="ml-3 text-gray-400 hover:text-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
