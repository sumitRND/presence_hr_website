import type { TeamLeavesMap } from "./leaveTypes";

export async function getPITeamLeaves(
    piUsername: string,
    month: number,
    year: number,
): Promise<TeamLeavesMap> {
    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE}/leave/hr/${piUsername}?month=${month}&year=${year}`,
            {
                headers: { Authorization: `Bearer ${localStorage.getItem("hr_token")}` },
            },
        );
        if (!response.ok) return {};
        const result = await response.json();
        if (result.success && result.data) {
            return result.data as TeamLeavesMap;
        }
        return {};
    } catch (error) {
        console.error("Error fetching team leaves:", error);
        return {};
    }
}
