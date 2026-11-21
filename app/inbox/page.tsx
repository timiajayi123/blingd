'use client';

import { useEffect, useState } from 'react';
import { account, databases, Config } from '@/lib/appwriteConfig';
import { Query } from 'appwrite';

export default function InboxPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const user = await account.get();

        const res = await databases.listDocuments(
          Config.databaseId,
          Config.messagesCollectionId,
          [Query.equal('to', user.$id)]
        );

        setMessages(res.documents.reverse());
      } catch (err) {
        console.error('❌ Failed to fetch messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  const openMessage = async (msg: any) => {
    setSelectedMessage(msg);

    if (!msg.read) {
      try {
        setUpdating(true);
        await databases.updateDocument(
          Config.databaseId,
          Config.messagesCollectionId,
          msg.$id,
          { read: true }
        );

        // ✅ Update UI instantly
        setMessages((prev) =>
          prev.map((m) => (m.$id === msg.$id ? { ...m, read: true } : m))
        );
      } catch (err) {
        console.error('❌ Failed to mark as read:', err);
      } finally {
        setUpdating(false);
      }
    }
  };

  const closeModal = () => setSelectedMessage(null);

  return (
    <div className="max-w-3xl mx-auto bg-white shadow-md rounded-xl p-6 mt-10">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 text-center">📩 Inbox</h2>

      {loading ? (
        <p>Loading messages...</p>
      ) : messages.length === 0 ? (
        <p className="text-gray-600 text-center">No messages yet.</p>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.$id}
              onClick={() => openMessage(msg)}
              className={`border rounded-lg p-4 transition cursor-pointer hover:shadow-md ${
                msg.read ? 'bg-gray-50' : 'bg-blue-50'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-semibold text-gray-800">{msg.subject}</h3>
                <span className="text-xs text-gray-500">
                  {new Date(msg.$createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-gray-700 truncate">{msg.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* ✅ Message Modal with translucent background */}
      {selectedMessage && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 transition">
          <div className="bg-white/80 backdrop-blur-md max-w-md w-full rounded-2xl shadow-lg p-6 relative border border-gray-200">
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              ✖
            </button>
            <h3 className="text-xl font-semibold mb-2">{selectedMessage.subject}</h3>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {selectedMessage.body}
            </p>

            <div className="text-right mt-4 text-sm text-gray-500">
              {updating ? 'Updating...' : new Date(selectedMessage.$createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
