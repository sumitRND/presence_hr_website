export interface LeaveDateEntry {
    date: string;
    reason: string | null;
    fromDate: string;
    toDate: string;
    refNum: string;
    leaveType: string | null;  // "01" = CL, "10" = EL
    dayType: string | null;    // "11" = Full day, "10" = Forenoon, "01" = Afternoon
}

// Map of employeeId -> leave dates
export type TeamLeavesMap = Record<string, LeaveDateEntry[]>;
