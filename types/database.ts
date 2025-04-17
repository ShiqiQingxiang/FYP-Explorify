export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string
          created_at: string
          update_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          update_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          update_at?: string
        }
      }
      conversation_participants: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          read?: boolean
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          created_at: string
          name: string | null
          email: string
          image: string | null
          bio: string | null
          address: string | null
          phoneNumber: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name?: string | null
          email: string
          image?: string | null
          bio?: string | null
          address?: string | null
          phoneNumber?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string | null
          email?: string
          image?: string | null
          bio?: string | null
          address?: string | null
          phoneNumber?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 