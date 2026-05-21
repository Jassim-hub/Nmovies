'use client'
import AdminPanelLayout from "@/app/components/layout";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";

interface Notification {
  id: string;
  title: string;
  message: string;
  image_url?: string;
  status: 'draft' | 'sent';
  created_at: string;
  updated_at: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  
  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [updating, setUpdating] = useState(false);

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<Notification | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Message state
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Load notifications from Supabase
  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      alert('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  // Auto-hide message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleAddNotification = async () => {
    if (!newTitle.trim() || !newMessage.trim()) {
      setMessage({ type: 'error', text: 'Title and message are required' });
      return;
    }

    try {
      const notificationData = {
        title: newTitle.trim(),
        message: newMessage.trim(),
        status: 'draft' as const,
        // user_id will be NULL (broadcast to all users)
        // read will default to false
      };

      const { data, error } = await supabase
        .from('notifications')
        .insert([notificationData])
        .select()
        .single();

      if (error) throw error;

      setNotifications([data, ...notifications]);
      setNewTitle("");
      setNewMessage("");
      setOpen(false);
      setMessage({ type: 'success', text: 'Notification saved successfully!' });
    } catch (error) {
      console.error('Error saving notification:', error);
      setMessage({ type: 'error', text: 'Failed to save notification' });
    }
  };

  const handleSendNotification = async (notification: Notification) => {
    setSending(notification.id);
    
    try {
      const response = await fetch('/panel/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: notification.title,
          message: notification.message,
          imageUrl: notification.image_url,
          targetType: 'segments',
          targetSegments: ['All'],
          data: {
            type: 'admin_notification',
            notification_id: notification.id,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send notification');
      }

      // Update notification status to 'sent'
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'sent' })
        .eq('id', notification.id);

      if (error) {
        console.error('Error updating notification status:', error);
      }

      // Update local state
      setNotifications(notifications.map(n => 
        n.id === notification.id ? { ...n, status: 'sent' as const } : n
      ));

      setMessage({ type: 'success', text: 'Notification sent successfully!' });
    } catch (error) {
      console.error('Error sending notification:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to send notification' 
      });
    } finally {
      setSending(null);
    }
  };

  const handleEditClick = (notification: Notification) => {
    setEditingNotification(notification);
    setEditTitle(notification.title);
    setEditMessage(notification.message);
    setIsEditModalOpen(true);
  };

  const handleUpdateNotification = async () => {
    if (!editingNotification) return;

    if (!editTitle.trim() || !editMessage.trim()) {
      setMessage({ type: 'error', text: 'Title and message are required' });
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          title: editTitle.trim(),
          message: editMessage.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingNotification.id);

      if (error) throw error;

      // Update local state
      setNotifications(notifications.map(n => 
        n.id === editingNotification.id 
          ? { ...n, title: editTitle.trim(), message: editMessage.trim() }
          : n
      ));

      setMessage({ type: 'success', text: 'Notification updated successfully!' });
      setIsEditModalOpen(false);
      setEditingNotification(null);
      setEditTitle("");
      setEditMessage("");
    } catch (error) {
      console.error('Error updating notification:', error);
      setMessage({ type: 'error', text: 'Failed to update notification' });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClick = (notification: Notification) => {
    setNotificationToDelete(notification);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!notificationToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationToDelete.id);

      if (error) throw error;

      setNotifications(notifications.filter(n => n.id !== notificationToDelete.id));
      setMessage({ type: 'success', text: 'Notification deleted successfully!' });
      setIsDeleteModalOpen(false);
      setNotificationToDelete(null);
    } catch (error) {
      console.error('Error deleting notification:', error);
      setMessage({ type: 'error', text: 'Failed to delete notification' });
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setNotificationToDelete(null);
  };

  return (
    <AdminPanelLayout>
      {/* Message Display */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg font-bold text-sm tracking-wide ${message.type === 'success'
            ? 'bg-green-900/20 border border-green-900 text-green-500'
            : 'bg-red-900/20 border border-red-900 text-[#E50914]'
          }`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white uppercase tracking-wider">Notifications</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#E50914] hover:bg-[#b80710] text-white px-6 py-2 rounded-lg font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(229,9,20,0.3)] w-full sm:w-auto">
              + Add Notification
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1c21] border border-gray-800 text-white mx-4 sm:mx-0 max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white uppercase tracking-wider font-bold">Add Notification</DialogTitle>
            </DialogHeader>
            <div className="py-4 flex flex-col gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Title</label>
                <input
                  type="text"
                  placeholder="Enter notification title"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="bg-black border border-gray-800 rounded-lg px-4 py-3 w-full text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] placeholder-gray-600 transition-all"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Message</label>
                <textarea
                  placeholder="Enter notification message"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="bg-black border border-gray-800 rounded-lg px-4 py-3 w-full text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] placeholder-gray-600 min-h-[100px] resize-y transition-all"
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 border-t border-gray-800">
              <DialogClose asChild>
                <Button variant="outline" className="w-full sm:w-auto bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold">Cancel</Button>
              </DialogClose>
              <Button className="w-full sm:w-auto bg-[#E50914] hover:bg-[#b80710] text-white uppercase tracking-wider font-bold shadow-[0_0_10px_rgba(229,9,20,0.2)]" onClick={handleAddNotification}>
                Add Notification
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-[#1a1c21] rounded-2xl shadow-xl border border-gray-800 overflow-hidden mb-8">
        <table className="min-w-full text-left">
          <thead className="bg-[#141414] border-b border-gray-800">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-16">#</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-1/4">Title</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Message</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-32">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-64">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {notifications.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-bold uppercase tracking-wider">
                  {loading ? 'Loading notifications...' : 'No notifications found'}
                </td>
              </tr>
            ) : (
              notifications.map((n, idx) => (
                <tr key={n.id} className="hover:bg-[#141414] transition-colors">
                  <td className="px-6 py-4 text-white font-medium">{idx + 1}</td>
                  <td className="px-6 py-4 text-white font-bold">{n.title}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm max-w-md truncate">{n.message}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${
                      n.status === 'sent' 
                        ? 'bg-green-900/20 text-green-500 border-green-900/50' 
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${n.status === 'sent' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      {n.status === 'sent' ? 'Sent' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <Button 
                      className={`text-xs uppercase tracking-wider font-bold transition-all px-3 py-1.5 h-auto ${
                        n.status === 'sent' 
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                          : 'bg-[#141414] border border-[#E50914] text-[#E50914] hover:bg-[#E50914] hover:text-white'
                      }`}
                      onClick={() => handleSendNotification(n)}
                      disabled={sending === n.id || n.status === 'sent'}
                    >
                      {sending === n.id ? 'Sending...' : 'Send'}
                    </Button>
                    <Button 
                      variant="outline"
                      className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white text-xs uppercase tracking-wider font-bold px-3 py-1.5 h-auto"
                      onClick={() => handleEditClick(n)}
                      disabled={n.status === 'sent'}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="destructive"
                      className="bg-[#141414] border border-red-900/50 text-[#E50914] hover:bg-[#E50914] hover:text-white text-xs uppercase tracking-wider font-bold px-3 py-1.5 h-auto transition-all" 
                      onClick={() => handleDeleteClick(n)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4 mb-8">
        {notifications.length === 0 ? (
          <div className="bg-[#1a1c21] rounded-xl p-8 border border-gray-800 shadow-lg text-center text-gray-500 font-bold uppercase tracking-wider">
            {loading ? 'Loading...' : 'No notifications found'}
          </div>
        ) : (
          notifications.map((n, idx) => (
            <div key={n.id} className="bg-[#1a1c21] rounded-xl p-5 border border-gray-800 shadow-lg hover:border-gray-700 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-gray-500 bg-black px-2 py-0.5 rounded border border-gray-800">#{idx + 1}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
                      n.status === 'sent' 
                        ? 'bg-green-900/20 text-green-500 border-green-900/50' 
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}>
                      {n.status === 'sent' ? 'Sent' : 'Draft'}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-lg mb-1">{n.title}</h3>
                  <p className="text-sm text-gray-400 mb-3 line-clamp-3 leading-relaxed">{n.message}</p>
                  <div className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {new Date(n.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-4 border-t border-gray-800">
                <Button 
                  className={`w-full text-xs uppercase tracking-wider font-bold transition-all py-5 ${
                    n.status === 'sent' 
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                      : 'bg-[#141414] border border-[#E50914] text-[#E50914] hover:bg-[#E50914] hover:text-white shadow-[0_0_10px_rgba(229,9,20,0.1)]'
                  }`}
                  onClick={() => handleSendNotification(n)}
                  disabled={sending === n.id || n.status === 'sent'}
                >
                  {sending === n.id ? 'Sending...' : 'Broadcast Notification'}
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    className="flex-1 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white text-xs uppercase tracking-wider font-bold"
                    onClick={() => handleEditClick(n)}
                    disabled={n.status === 'sent'}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="destructive"
                    className="flex-1 bg-[#141414] border border-red-900/50 text-[#E50914] hover:bg-[#E50914] hover:text-white text-xs uppercase tracking-wider font-bold transition-all" 
                    onClick={() => handleDeleteClick(n)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Notification Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-[#1a1c21] border border-gray-800 text-white mx-4 sm:mx-0 max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white uppercase tracking-wider font-bold">Edit Notification</DialogTitle>
          </DialogHeader>
          <div className="py-4 flex flex-col gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Title</label>
              <input
                type="text"
                placeholder="Title"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="bg-black border border-gray-800 rounded-lg px-4 py-3 w-full text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Message</label>
              <textarea
                placeholder="Message"
                value={editMessage}
                onChange={e => setEditMessage(e.target.value)}
                className="bg-black border border-gray-800 rounded-lg px-4 py-3 w-full text-white focus:outline-none focus:ring-1 focus:ring-[#E50914] min-h-[100px] resize-y transition-all"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 border-t border-gray-800">
            <DialogClose asChild>
              <Button variant="outline" disabled={updating} className="w-full sm:w-auto bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold">Cancel</Button>
            </DialogClose>
            <Button 
              className="w-full sm:w-auto bg-[#E50914] hover:bg-[#b80710] text-white uppercase tracking-wider font-bold shadow-[0_0_10px_rgba(229,9,20,0.2)]" 
              onClick={handleUpdateNotification}
              disabled={updating}
            >
              {updating ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="bg-[#1a1c21] border border-gray-800 text-white mx-4 sm:mx-0 max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#E50914] uppercase tracking-wider font-bold">Delete Notification</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center border border-red-900/50">
                  <svg className="w-6 h-6 text-[#E50914]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">
                  Confirm Deletion
                </h3>
                <div className="text-sm text-gray-400 space-y-2">
                  <p>
                    Are you sure you want to delete <span className="text-white font-bold">"{notificationToDelete?.title}"</span>?
                  </p>
                  <p className="text-[#E50914] font-medium bg-red-900/10 p-2 rounded border border-red-900/30">
                    This action cannot be undone. Once deleted, this notification will be permanently removed.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 border-t border-gray-800">
            <Button
              variant="outline"
              onClick={cancelDelete}
              disabled={deleting}
              className="w-full sm:w-auto bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white uppercase tracking-wider font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleting}
              className="w-full sm:w-auto bg-[#E50914] hover:bg-[#b80710] text-white uppercase tracking-wider font-bold shadow-[0_0_15px_rgba(229,9,20,0.3)]"
            >
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPanelLayout>
  );
}