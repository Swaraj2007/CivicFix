import type { Department, IssueType } from '@/types';

const departmentMap: Record<IssueType, Department> = {
  'Pothole / Road Damage': 'Road Maintenance',
  'Waste / Garbage': 'Waste Management',
  Streetlight: 'Electrical Department',
  'Drainage / Waterlogging': 'Drainage Department',
  'Water Supply': 'Water Department',
  'Public Infrastructure': 'Public Works',
  'Traffic / Signage': 'Traffic Department',
};

export function suggestDepartment(issueType: IssueType): Department {
  return departmentMap[issueType] ?? 'Public Works';
}

export const allDepartments: Department[] = [
  'Road Maintenance',
  'Waste Management',
  'Electrical Department',
  'Water Department',
  'Drainage Department',
  'Public Works',
  'Traffic Department',
];
