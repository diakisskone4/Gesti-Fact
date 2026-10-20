export const colors = {
  primary: '#1F3A5F',
  primaryDark: '#152A45',
  primarySoft: '#E8EEF6',
  gold: '#C9A227',
  bg: '#F4F6F9',
  card: '#FFFFFF',
  ink: '#1E2329',
  muted: '#6B7280',
  line: '#E2E6EC',
  soft: '#F3F5F8',
  success: '#15803D',
  successSoft: '#DCFCE7',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
};

export const radius = { sm: 6, md: 10, lg: 14 };

export const shadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

export const STATUS = {
  draft: { label: 'Brouillon', color: colors.muted, bg: colors.soft },
  issued: { label: 'Émise', color: colors.warning, bg: colors.warningSoft },
  paid: { label: 'Payée', color: colors.success, bg: colors.successSoft },
  cancelled: { label: 'Annulée', color: colors.danger, bg: colors.dangerSoft },
};
