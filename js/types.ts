export interface Progression {
  weeks: string;
  instruction: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string | null;
  duration_sec?: number;
  duration_min?: number;
  tempo?: string;
  rpe?: number;
  rest_sec?: number;
  notes?: string;
  progression?: Progression[];
}

export interface Block {
  name: string;
  time_min: number;
  exercises: Exercise[];
}

export interface BaselineTest {
  id: string;
  name: string;
  unit: string;
  bilateral: boolean;
  target: number;
  instructions: string;
  reference?: string;
}

export interface SetLog {
  reps: number | null;
  weight_kg: number | null;
  duration_sec: number | null;
  side: string | null;
  rpe_actual: number | null;
}

export interface ExerciseLog {
  exercise_name: string;
  sets_completed: SetLog[];
}

export interface BaselineResult {
  test_id: string;
  value: number;
  side?: string;
}

export interface Session {
  date: string;
  baseline_results: BaselineResult[];
  exercise_logs: ExerciseLog[];
}

export interface AppData {
  program: Record<string, unknown>;
  baseline_tests: BaselineTest[];
  blocks: Block[];
  evidence?: Record<string, unknown>;
  sessions?: Session[];
}

export interface ExerciseSetInput {
  reps?: string;
  rpe?: string;
  left_reps?: string;
  right_reps?: string;
}

export interface ExerciseInput {
  completed?: boolean;
  weight_kg?: string;
  sets?: ExerciseSetInput[];
}

export interface DraftState {
  assessmentRun: boolean;
  baselineInputs: Record<string, Record<string, string>>;
  exerciseInputs: Record<string, ExerciseInput>;
  editingSessionIndex: number | null;
  editingDate: string | null;
}
