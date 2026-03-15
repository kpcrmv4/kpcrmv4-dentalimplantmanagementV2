"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * Subscribe to Supabase Realtime for the notifications table.
 * Returns live unread count that updates instantly when a new notification is inserted
 * or an existing one is marked as read.
 */
export function useRealtimeNotifications(
  userId: string,
  initialCount: number
) {
  const [unreadCount, setUnreadCount] = useState(initialCount)

  // Sync when server-rendered count changes (e.g. after navigation)
  useEffect(() => {
    setUnreadCount(initialCount)
  }, [initialCount])

  const refetchCount = useCallback(async () => {
    const supabase = createClient()
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)
    setUnreadCount(count ?? 0)
  }, [userId])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // New notification → increment
          setUnreadCount((prev) => prev + 1)
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Mark as read → refetch exact count
          refetchCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, refetchCount])

  return unreadCount
}
