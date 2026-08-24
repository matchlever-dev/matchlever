/**
 * Shared Database types aligned with Phase 1 migrations.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          linkedin_url: string | null;
          is_admin: boolean;
          is_superuser: boolean;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          linkedin_url?: string | null;
          is_admin?: boolean;
          is_superuser?: boolean;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          linkedin_url?: string | null;
          is_admin?: boolean;
          is_superuser?: boolean;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      talent_profiles: {
        Row: {
          id: string;
          user_id: string;
          headline: string | null;
          bio: string | null;
          global_city: string | null;
          global_country: string | null;
          timezone: string | null;
          timezone_offset: number | null;
          work_hours_start: string | null;
          work_hours_end: string | null;
          suggested_taglines: Json;
          verified_superpowers: Json;
          status: string;
          selected_tagline: string | null;
          verified_skills: Json;
          raw_resume_text: string | null;
          sanitized_summary: string | null;
          location_mode: string;
          location_modes: string[];
          max_commute_miles: number | null;
          open_to_relocation: boolean | null;
          min_salary: number | null;
          visa_status: string | null;
          years_experience: number | null;
          talent_tos_accepted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          headline?: string | null;
          bio?: string | null;
          global_city?: string | null;
          global_country?: string | null;
          timezone?: string | null;
          timezone_offset?: number | null;
          work_hours_start?: string | null;
          work_hours_end?: string | null;
          suggested_taglines?: Json;
          verified_superpowers?: Json;
          status?: string;
          selected_tagline?: string | null;
          verified_skills?: Json;
          raw_resume_text?: string | null;
          sanitized_summary?: string | null;
          location_mode?: string;
          location_modes?: string[];
          max_commute_miles?: number | null;
          open_to_relocation?: boolean | null;
          min_salary?: number | null;
          visa_status?: string | null;
          years_experience?: number | null;
          talent_tos_accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          headline?: string | null;
          bio?: string | null;
          global_city?: string | null;
          global_country?: string | null;
          timezone?: string | null;
          timezone_offset?: number | null;
          work_hours_start?: string | null;
          work_hours_end?: string | null;
          suggested_taglines?: Json;
          verified_superpowers?: Json;
          status?: string;
          selected_tagline?: string | null;
          verified_skills?: Json;
          raw_resume_text?: string | null;
          sanitized_summary?: string | null;
          location_mode?: string;
          location_modes?: string[];
          max_commute_miles?: number | null;
          open_to_relocation?: boolean | null;
          min_salary?: number | null;
          visa_status?: string | null;
          years_experience?: number | null;
          talent_tos_accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "talent_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      talent_references: {
        Row: {
          id: string;
          talent_profile_id: string;
          reference_name: string | null;
          reference_email: string;
          reference_linkedin_url: string | null;
          relationship: string | null;
          authenticity_score: number | null;
          authenticity_flags: Json;
          verification_token: string;
          status: string;
          superpowers: Json;
          reliability_score: number | null;
          technical_quality_score: number | null;
          rehire_intent_score: number | null;
          endorsement: string | null;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          talent_profile_id: string;
          reference_name?: string | null;
          reference_email: string;
          reference_linkedin_url?: string | null;
          relationship?: string | null;
          authenticity_score?: number | null;
          authenticity_flags?: Json;
          verification_token?: string;
          status?: string;
          superpowers?: Json;
          reliability_score?: number | null;
          technical_quality_score?: number | null;
          rehire_intent_score?: number | null;
          endorsement?: string | null;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          talent_profile_id?: string;
          reference_name?: string | null;
          reference_email?: string;
          reference_linkedin_url?: string | null;
          relationship?: string | null;
          authenticity_score?: number | null;
          authenticity_flags?: Json;
          verification_token?: string;
          status?: string;
          superpowers?: Json;
          reliability_score?: number | null;
          technical_quality_score?: number | null;
          rehire_intent_score?: number | null;
          endorsement?: string | null;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "talent_references_talent_profile_id_fkey";
            columns: ["talent_profile_id"];
            isOneToOne: false;
            referencedRelation: "talent_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      employer_profiles: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          title: string | null;
          global_city: string | null;
          global_country: string | null;
          status: string;
          user_role: string | null;
          company_website: string | null;
          industry: string | null;
          company_size: string | null;
          estimated_roles: number | null;
          hiring_departments: string[];
          work_arrangement: string | null;
          first_match_free_claimed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name: string;
          title?: string | null;
          global_city?: string | null;
          global_country?: string | null;
          status?: string;
          user_role?: string | null;
          company_website?: string | null;
          industry?: string | null;
          company_size?: string | null;
          estimated_roles?: number | null;
          hiring_departments?: string[];
          work_arrangement?: string | null;
          first_match_free_claimed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          title?: string | null;
          global_city?: string | null;
          global_country?: string | null;
          status?: string;
          user_role?: string | null;
          company_website?: string | null;
          industry?: string | null;
          company_size?: string | null;
          estimated_roles?: number | null;
          hiring_departments?: string[];
          work_arrangement?: string | null;
          first_match_free_claimed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "employer_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_postings: {
        Row: {
          id: string;
          employer_profile_id: string;
          title: string;
          company_name: string | null;
          description: string | null;
          status: string;
          kanban_columns: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employer_profile_id: string;
          title: string;
          company_name?: string | null;
          description?: string | null;
          status?: string;
          kanban_columns?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employer_profile_id?: string;
          title?: string;
          company_name?: string | null;
          description?: string | null;
          status?: string;
          kanban_columns?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_postings_employer_profile_id_fkey";
            columns: ["employer_profile_id"];
            isOneToOne: false;
            referencedRelation: "employer_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      match_handshakes: {
        Row: {
          id: string;
          job_posting_id: string;
          talent_profile_id: string;
          kanban_column: string;
          is_manual_match: boolean;
          matched_by: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_posting_id: string;
          talent_profile_id: string;
          kanban_column?: string;
          is_manual_match?: boolean;
          matched_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          job_posting_id?: string;
          talent_profile_id?: string;
          kanban_column?: string;
          is_manual_match?: boolean;
          matched_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_handshakes_job_posting_id_fkey";
            columns: ["job_posting_id"];
            isOneToOne: false;
            referencedRelation: "job_postings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_handshakes_talent_profile_id_fkey";
            columns: ["talent_profile_id"];
            isOneToOne: false;
            referencedRelation: "talent_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_requests: {
        Row: {
          id: string;
          email: string;
          topic: string;
          message: string;
          attachment_url: string | null;
          admin_notes: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          topic: string;
          message: string;
          attachment_url?: string | null;
          admin_notes?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          topic?: string;
          message?: string;
          attachment_url?: string | null;
          admin_notes?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_unsubscribes: {
        Row: {
          email: string;
          unsubscribed_at: string;
        };
        Insert: {
          email: string;
          unsubscribed_at?: string;
        };
        Update: {
          email?: string;
          unsubscribed_at?: string;
        };
        Relationships: [];
      };
      site_copy: {
        Row: {
          id: number;
          hero_taglines: string[];
          brand_tagline: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          hero_taglines: string[];
          brand_tagline: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          hero_taglines?: string[];
          brand_tagline?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_superuser: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_reference_invite: {
        Args: { p_token: string };
        Returns: {
          token: string;
          status: string;
          relationship: string | null;
          reference_name: string | null;
          reference_linkedin_url: string | null;
          talent_title: string;
          talent_tagline: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
