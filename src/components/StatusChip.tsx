import React from 'react';

const STATUS_CLASSES: Record<string, string> = {
  'Regulasi Akademik': 'status-regulasi',
  'Lulus': 'status-lulus',
  'Alih Prodi': 'status-alih',
  'Undur Diri': 'status-undur',
  'Bekerja': 'status-bekerja',
  'Studi Lanjut': 'status-studi',
  'Wiraswasta': 'status-wira',
  'Belum Bekerja': 'status-belumbekerja',
  'Juara 1': 'status-juara1',
  'Juara 2': 'status-juara2',
  'Juara 3': 'status-juara3',
  'Nasional': 'status-tingkat-nasional',
  'Internasional': 'status-tingkat-internasional',
  'Wilayah': 'status-tingkat-wilayah'
};

export type StatusTone = 'green' | 'blue' | 'amber' | 'red' | 'gold' | 'silver' | 'bronze' | 'violet' | 'neutral';

const TONE_CLASSES: Record<StatusTone, string> = {
  green: 'status-lulus',
  blue: 'status-regulasi',
  amber: 'status-alih',
  red: 'status-undur',
  gold: 'status-juara1',
  silver: 'status-juara2',
  bronze: 'status-juara3',
  violet: 'status-tingkat-internasional',
  neutral: 'status-neutral'
};

interface StatusChipProps {
  status: string;
  tone?: StatusTone;
  count?: boolean;
  dot?: boolean;
  className?: string;
}

export default function StatusChip({ status, tone, count, dot, className = '' }: StatusChipProps) {
  const cls = STATUS_CLASSES[status] || (tone ? TONE_CLASSES[tone] : 'status-neutral');
  return (
    <span className={`chip ${cls} ${count ? 'chip-count' : ''} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {status}
    </span>
  );
}