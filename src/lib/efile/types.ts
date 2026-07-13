export type EfilingProvider = 'track1099' | 'irs_fire' | 'cra'

export type EfilingStatus = 'pending' | 'submitted' | 'accepted' | 'rejected' | 'failed'

export type EfilingResult =
  | { ok: true; provider: EfilingProvider; submissionId: string; status: EfilingStatus }
  | { ok: false; provider: EfilingProvider; error: string }
