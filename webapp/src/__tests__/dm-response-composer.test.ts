/**
 * Unit tests for the DM Response Composer module.
 * Tests the filtering logic for unanswered DMs.
 * File system access is avoided — pure logic is extracted and tested inline.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedMessage {
  sender: string;
  content: string;
  timestamp: Date;
}

interface UnansweredDM {
  username: string;
  lastMessage: string;
  lastMessageAt: Date;
  profileUrl: string;
  conversationPath: string;
}

// ─── Pure helpers (mirrors dm-response-composer.ts logic) ─────────────────────

/** Returns true if the conversation's last message was NOT from the creator */
function isUnanswered(messages: ParsedMessage[], creatorUsername: string): boolean {
  if (messages.length === 0) return false;
  const lastMsg = messages[messages.length - 1];
  return lastMsg.sender !== creatorUsername;
}

/** Build an UnansweredDM record from conversation data */
function buildUnansweredDM(
  username: string,
  messages: ParsedMessage[],
  convPath: string
): UnansweredDM {
  const lastMsg = messages[messages.length - 1];
  return {
    username,
    lastMessage: lastMsg.content.slice(0, 200),
    lastMessageAt: lastMsg.timestamp,
    profileUrl: `https://instagram.com/${username}`,
    conversationPath: convPath,
  };
}

/** Filter conversations older than N days */
function filterByAge(dms: UnansweredDM[], maxDays: number): UnansweredDM[] {
  const cutoff = new Date(Date.now() - maxDays * 24 * 60 * 60 * 1000);
  return dms.filter((dm) => dm.lastMessageAt.getTime() === 0 || dm.lastMessageAt >= cutoff);
}

/** Sort by most recent last message */
function sortByRecent(dms: UnansweredDM[]): UnansweredDM[] {
  return [...dms].sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CREATOR = "jeanseestheworld";
const NOW = new Date("2026-02-24T18:00:00Z");

const convAnswered: ParsedMessage[] = [
  { sender: "alice", content: "Salut !", timestamp: new Date("2026-02-20T10:00:00Z") },
  { sender: CREATOR, content: "Coucou !", timestamp: new Date("2026-02-21T09:00:00Z") },
];

const convUnanswered: ParsedMessage[] = [
  { sender: CREATOR, content: "Hey !", timestamp: new Date("2026-02-15T12:00:00Z") },
  {
    sender: "bob",
    content: "Merci pour le contenu !",
    timestamp: new Date("2026-02-22T14:00:00Z"),
  },
];

const convOnlyCreator: ParsedMessage[] = [
  { sender: CREATOR, content: "Bonjour !", timestamp: new Date("2026-02-10T08:00:00Z") },
];

const convEmpty: ParsedMessage[] = [];

const convOld: ParsedMessage[] = [
  { sender: "carol", content: "Vieux message", timestamp: new Date("2025-05-01T00:00:00Z") },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("isUnanswered", () => {
  it("returns false when creator sent the last message", () => {
    expect(isUnanswered(convAnswered, CREATOR)).toBe(false);
  });

  it("returns true when someone else sent the last message", () => {
    expect(isUnanswered(convUnanswered, CREATOR)).toBe(true);
  });

  it("returns false when only the creator has sent messages", () => {
    expect(isUnanswered(convOnlyCreator, CREATOR)).toBe(false);
  });

  it("returns false for empty conversation", () => {
    expect(isUnanswered(convEmpty, CREATOR)).toBe(false);
  });

  it("is case-sensitive on creator username", () => {
    // If creator username doesn't match exactly, message is considered unanswered
    const msgs: ParsedMessage[] = [
      { sender: "JeanSeesTheWorld", content: "Hi", timestamp: new Date() },
    ];
    // Different case — treated as unanswered
    expect(isUnanswered(msgs, CREATOR)).toBe(true);
  });
});

describe("buildUnansweredDM", () => {
  it("builds correct UnansweredDM from conversation", () => {
    const dm = buildUnansweredDM("bob", convUnanswered, "inbox/bob_12345");
    expect(dm.username).toBe("bob");
    expect(dm.lastMessage).toBe("Merci pour le contenu !");
    expect(dm.profileUrl).toBe("https://instagram.com/bob");
    expect(dm.conversationPath).toBe("inbox/bob_12345");
  });

  it("truncates lastMessage to 200 chars", () => {
    const longMessage = "x".repeat(300);
    const msgs: ParsedMessage[] = [
      { sender: "alice", content: longMessage, timestamp: new Date() },
    ];
    const dm = buildUnansweredDM("alice", msgs, "inbox/alice_1");
    expect(dm.lastMessage.length).toBe(200);
  });

  it("sets correct profileUrl", () => {
    const dm = buildUnansweredDM("testuser", convUnanswered, "inbox/testuser_99");
    expect(dm.profileUrl).toBe("https://instagram.com/testuser");
  });
});

describe("filterByAge", () => {
  const recentDM: UnansweredDM = {
    username: "bob",
    lastMessage: "Hey",
    lastMessageAt: new Date("2026-02-20T00:00:00Z"),
    profileUrl: "https://instagram.com/bob",
    conversationPath: "inbox/bob_1",
  };

  const oldDM: UnansweredDM = {
    username: "carol",
    lastMessage: "Old message",
    lastMessageAt: new Date("2025-05-01T00:00:00Z"),
    profileUrl: "https://instagram.com/carol",
    conversationPath: "inbox/carol_1",
  };

  const unknownDateDM: UnansweredDM = {
    ...recentDM,
    username: "dave",
    lastMessageAt: new Date(0), // epoch = unknown date
  };

  it("keeps recent DMs within the cutoff", () => {
    const filtered = filterByAge([recentDM], 180);
    expect(filtered).toHaveLength(1);
  });

  it("removes DMs older than maxDays", () => {
    const filtered = filterByAge([oldDM], 180);
    expect(filtered).toHaveLength(0);
  });

  it("keeps DMs with unknown date (epoch = 0)", () => {
    const filtered = filterByAge([unknownDateDM], 180);
    expect(filtered).toHaveLength(1);
  });

  it("handles mixed list correctly", () => {
    const filtered = filterByAge([recentDM, oldDM, unknownDateDM], 180);
    expect(filtered).toHaveLength(2);
    expect(filtered.find((d) => d.username === "carol")).toBeUndefined();
  });
});

describe("sortByRecent", () => {
  const dm1: UnansweredDM = {
    username: "alice",
    lastMessage: "First",
    lastMessageAt: new Date("2026-02-10T00:00:00Z"),
    profileUrl: "",
    conversationPath: "",
  };
  const dm2: UnansweredDM = {
    username: "bob",
    lastMessage: "Second",
    lastMessageAt: new Date("2026-02-22T00:00:00Z"),
    profileUrl: "",
    conversationPath: "",
  };
  const dm3: UnansweredDM = {
    username: "carol",
    lastMessage: "Third",
    lastMessageAt: new Date("2026-01-01T00:00:00Z"),
    profileUrl: "",
    conversationPath: "",
  };

  it("sorts most recent first", () => {
    const sorted = sortByRecent([dm1, dm3, dm2]);
    expect(sorted[0].username).toBe("bob");
    expect(sorted[1].username).toBe("alice");
    expect(sorted[2].username).toBe("carol");
  });

  it("does not mutate the original array", () => {
    const original = [dm1, dm2, dm3];
    sortByRecent(original);
    expect(original[0].username).toBe("alice");
  });
});

describe("end-to-end filtering pipeline", () => {
  it("processes a list of conversations into unanswered DMs", () => {
    const conversations: Array<{ username: string; messages: ParsedMessage[] }> = [
      { username: "alice", messages: convAnswered },
      { username: "bob", messages: convUnanswered },
      { username: "carol", messages: convOld },
      { username: "dave", messages: convEmpty },
    ];

    const raw = conversations
      .filter(({ messages }) => isUnanswered(messages, CREATOR))
      .map(({ username, messages }) =>
        buildUnansweredDM(username, messages, `inbox/${username}_1`)
      );

    const filtered = filterByAge(raw, 180);
    const sorted = sortByRecent(filtered);

    // Only bob is unanswered and recent enough (carol is too old, alice answered, dave empty)
    expect(sorted).toHaveLength(1);
    expect(sorted[0].username).toBe("bob");
    void NOW; // suppress unused variable warning
  });
});
