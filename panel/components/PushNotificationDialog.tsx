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
  const [message, setMessage] = useState(contentTitle ? `Check out the new ${contentType} "${contentTitle}" now available!` : '');
  const [targetType, setTargetType] = useState<'all' | 'segments'>('all');
  const [segments, setSegments] = useState<string[]>(['All']);
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
      setMessage(`Check out the new ${contentType} "${contentTitle}" now available!`);
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
        targetSegments: targetType === 'segments' ? segments : undefined,
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
        // Save to database
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
        const recipients = onesignalData.recipients ?? 'unknown';
        const notificationId = onesignalData.id || 'N/A';
        
        const successMessage = `📱 Recipients: ${recipients} users | ID: ${notificationId}`;
        
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
        setMessage(contentTitle ? `Check out the new ${contentType} "${contentTitle}" now available!` : '');
        setTargetType('all');
        setSegments(['All']);
      } else {
        setNotification({
          show: true,
          type: 'error',
          title: '❌ Failed to send notification',
          message: result.error || 'Unknown error occurred'
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
      <DialogContent className="mx-4 max-w-md">
        <DialogHeader>
          <DialogTitle>Send Push Notification</DialogTitle>
          <DialogDescription className="sr-only">Send a push notification to users</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notification Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notification title..."
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">{title.length}/100 characters</p>
          </div>

          {/* Message Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notification Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter notification message..."
              rows={3}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">{message.length}/200 characters</p>
          </div>

          {/* Target Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Send To
            </label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as 'all' | 'segments')}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Users</option>
              <option value="segments">Specific Segments</option>
            </select>
          </div>

          {/* Segments Selection (only if targetType is 'segments') */}
          {targetType === 'segments' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Segments
              </label>
              <div className="space-y-2">
                {['All', 'Active Users', 'Premium Users', 'New Users'].map((segment) => (
                  <label key={segment} className="flex items-center">
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
                      className="mr-2"
                    />
                    <span className="text-sm">{segment}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {contentImage && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notification Preview
              </label>
              <div className="border border-gray-200 rounded p-3 bg-gray-50">
                <div className="flex items-start space-x-3">
                  <Image
                    src={contentImage}
                    alt="Preview"
                    width={48}
                    height={48}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
                    <p className="text-sm text-gray-600 line-clamp-2">{message}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="w-full sm:w-auto"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600"
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
              ? 'bg-green-50 border-green-500 text-green-800' 
              : 'bg-red-50 border-red-500 text-red-800'
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
                className="ml-3 text-gray-400 hover:text-gray-600 transition-colors"
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
