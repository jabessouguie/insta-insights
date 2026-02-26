import { computeFollowerGrowth } from "../lib/instagram-parser";

describe("computeFollowerGrowth", () => {
    it("fills gaps between months with zero followers", () => {
        const followers: Partial<InstagramFollower>[] = [
            { followedAt: new Date("2023-01-15T10:00:00Z"), username: "u1" },
            { followedAt: new Date("2023-04-10T10:00:00Z"), username: "u2" },
        ];

        const result = computeFollowerGrowth(followers as InstagramFollower[], 2);

        expect(result).toHaveLength(4); // Jan, Feb, Mar, Apr
        expect(result[0]).toMatchObject({ month: "2023-01", gain: 1, count: 1 });
        expect(result[1]).toMatchObject({ month: "2023-02", gain: 0, count: 1 });
        expect(result[2]).toMatchObject({ month: "2023-03", gain: 0, count: 1 });
        expect(result[3]).toMatchObject({ month: "2023-04", gain: 1, count: 2 });
    });

    it("handles empty followers array", () => {
        const result = computeFollowerGrowth([], 100);
        expect(result).toEqual([]);
    });

    it("offsets the base correctly to reach realFollowerCount", () => {
        const followers: Partial<InstagramFollower>[] = [
            { followedAt: new Date("2023-01-15T10:00:00Z"), username: "u1" },
        ];
        // real follower count is 10, but we only have 1 in history
        const result = computeFollowerGrowth(followers as InstagramFollower[], 10);

        expect(result[0]).toMatchObject({ month: "2023-01", count: 10, gain: 1 });
    });
});
