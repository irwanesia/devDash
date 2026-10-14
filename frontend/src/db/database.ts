import Dexie, { type Table } from 'dexie';

// Tipe dasar sinkronisasi (PRD §4, §6)
export interface BaseRecord {
  id: string;
  updated_at: string;
  deleted_at: string | null;
  synced_at?: string | null;
}

export type ProjectStatus = 'ide' | 'berjalan' | 'ditunda' | 'selesai';
export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskPriority = 'rendah' | 'sedang' | 'tinggi';

export interface Category extends BaseRecord {
  name: string;
  color: string;
  sort_order: number;
}

export interface Project extends BaseRecord {
  name: string;
  description: string;
  client: string;
  status: ProjectStatus;
  start_date: string;
  target_date: string;
  value_amount: number | null;
  notes: string;
  category_id: string | null;
}

export interface Task extends BaseRecord {
  project_id: string | null;
  category_id: string | null;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  sort_order: number;
}

export interface DailyTemplate extends BaseRecord {
  title: string;
  sort_order: number;
  is_active: boolean;
  /** Tanggal mulai berlaku (YYYY-MM-DD). Kosong = selalu berlaku. Untuk "susun besok malam". */
  mulai_tanggal?: string;
}

export interface DailyLog {
  id?: number;
  log_date: string; // YYYY-MM-DD
  template_id: string;
  is_done: boolean;
  done_at: string | null;
  updated_at: string;
}

export interface Reminder extends BaseRecord {
  title: string;
  category: 'tagihan' | 'dp_proyek' | 'langganan' | 'lainnya';
  amount: number | null;
  due_date: string;
  repeat_rule: 'tidak' | 'mingguan' | 'bulanan' | 'tahunan';
  remind_days_before: number;
  status: 'belum' | 'lunas';
  paid_at: string | null;
  project_id: string | null;
  notes: string;
}

export interface StudySchedule extends BaseRecord {
  topic: string;
  weekdays: number[]; // 0=Min .. 6=Sab (JS getDay)
  start_time: string;
  duration_min: number;
  goal: string;
  resource_url: string;
  is_active: boolean;
}

export interface StudyLog {
  id?: number;
  schedule_id: string;
  log_date: string;
  is_done: boolean;
  done_at: string | null;
}

export interface AppSetting {
  key: string;
  value: string;
}

class DevDashDB extends Dexie {
  categories!: Table<Category, string>;
  projects!: Table<Project, string>;
  tasks!: Table<Task, string>;
  daily_templates!: Table<DailyTemplate, string>;
  daily_logs!: Table<DailyLog, number>;
  reminders!: Table<Reminder, string>;
  study_schedules!: Table<StudySchedule, string>;
  study_logs!: Table<StudyLog, number>;
  settings!: Table<AppSetting, string>;

  constructor() {
    super('devdash');
    this.version(1).stores({
      categories: 'id, name, updated_at',
      projects: 'id, status, category_id, target_date, updated_at',
      tasks: 'id, project_id, status, due_date, category_id, updated_at',
      daily_templates: 'id, sort_order',
      daily_logs: '++id, &[log_date+template_id], log_date',
      reminders: 'id, status, due_date, updated_at',
      study_schedules: 'id, updated_at',
      study_logs: '++id, &[schedule_id+log_date], log_date',
      settings: 'key',
    });
  }
}

export const db = new DevDashDB();

export const nowISO = () => new Date().toISOString();
export const todayStr = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export async function getSetting(key: string, fallback: string): Promise<string> {
  const row = await db.settings.get(key);
  return row ? row.value : fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value });
}
