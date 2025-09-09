// Growth Record Types
export interface GrowthRecord {
  id: string;
  childId: string;
  parentId?: string | { // Can be string or object with user info
    _id: string;
    id: string;
    firstName: string;
    lastName?: string;
    avatar?: string;
    name?: string;
  };
  type: 'height' | 'weight';
  value: number;
  unit: string;
  date: string;
  source: 'home' | 'doctor' | 'clinic' | 'hospital';
  notes?: string;
  visibility?: 'private' | 'public';
  createdAt: string;
  updatedAt: string;
}

export interface CreateGrowthRecordData {
  child: string; // Changed from childId to child to match API format
  type: 'height' | 'weight';
  value: number;
  unit: string;
  date: string;
  source: 'home' | 'doctor' | 'clinic' | 'hospital';
  notes?: string;
  visibility?: 'private' | 'public';
}

export interface UpdateGrowthRecordData {
  type?: 'height' | 'weight';
  value?: number;
  unit?: string;
  date?: string;
  source?: 'home' | 'doctor' | 'clinic' | 'hospital';
  notes?: string;
  visibility?: 'private' | 'public';
}

// WHO Standard Growth Data Types
export interface WHOStandardSD {
  minus2SD: number;
  mean: number;
  plus2SD: number;
}

export interface WHOStandardPercentile {
  p3: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p97: number;
}

export interface WHOStandardGrowthData {
  id: string;
  age: string;
  ageInMonths: number;
  gender: 'male' | 'female';
  weight: WHOStandardSD;
  height: WHOStandardSD;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWHOStandardData {
  age: string;
  ageInMonths: number;
  gender: 'male' | 'female';
  weight: WHOStandardSD;
  height: WHOStandardSD;
}

// Health Record Types
export interface HealthRecordAttachment {
  id: string;
  publicId: string;
  url: string;
  type: 'image' | 'video' | 'audio';
  filename: string;
  size: number;
  createdAt: string;
}

export interface HealthRecord {
  id: string;
  childId: string;
  parentId?: string | { // Can be string or object with user info
    _id: string;
    id: string;
    firstName: string;
    lastName?: string;
    avatar?: string;
    name?: string;
  };
  type: 'vaccination' | 'illness' | 'medication';
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  doctorName?: string;
  location?: string;
  attachments?: HealthRecordAttachment[];
  visibility?: 'private' | 'public';
  createdAt: string;
  updatedAt: string;
}

export interface CreateHealthRecordData {
  child: string; // Backend expects 'child' not 'childId'
  type: string;
  title: string;
  description: string;
  date: string; // Backend expects 'date' not 'startDate'
  endDate?: string;
  doctor?: string; // Backend expects 'doctor' not 'doctorName'
  location?: string;
  visibility?: 'private' | 'public';
  attachments?: string[];
}

export interface UpdateHealthRecordData {
  type?: 'vaccination' | 'illness' | 'medication';
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  doctorName?: string;
  location?: string;
  attachments?: HealthRecordAttachment[];
  visibility?: 'private' | 'public';
}

// Chart Data Types
export interface GrowthDataPoint {
  date: string;
  height?: number;
  weight?: number;
}

export interface GrowthChartData {
  height: GrowthDataPoint[];
  weight: GrowthDataPoint[];
}

// Growth Analysis Types
export interface GrowthAnalysis {
  childValue: number;
  childAgeInMonths: number;
  childGender: 'male' | 'female';
  whoStandard: WHOStandardGrowthData;
  percentile: number;
  status: 'below_p3' | 'p3_to_p10' | 'p10_to_p25' | 'p25_to_p75' | 'p75_to_p90' | 'p90_to_p97' | 'above_p97';
  recommendation?: string;
}

// Filter Types
export interface GrowthFilter {
  type: 'height' | 'weight';
  dateRange: '1month' | '3months' | '6months' | '1year' | 'all';
}

export interface HealthFilter {
  type: 'vaccination' | 'illness' | 'medication' | 'all';
  dateRange: '1month' | '3months' | '6months' | '1year' | 'all';
} 