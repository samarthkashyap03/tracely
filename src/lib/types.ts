export type OptionCategory = "status" | "platform" | "work_type" | "role";

export interface JobApplication {
  id: string;
  user_id: string;
  company_name: string;
  role: string | null;
  status: string;
  platform: string | null;
  work_type: string | null;
  location: string | null;
  salary: string | null;
  url: string | null;
  notes: string | null;
  applied_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserOption {
  id: string;
  user_id: string;
  category: OptionCategory;
  value: string;
  created_at: string;
}
