import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Mirrors the legacy Prisma/SQLite schema 1:1.
// Dates are stored as epoch milliseconds; JSON strings stay JSON strings.
export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.optional(v.union(v.string(), v.null())),
    image: v.optional(v.union(v.string(), v.null())),
    passwordHash: v.optional(v.union(v.string(), v.null())),
    role: v.string(), // ADMIN | STUDENT
    hidden: v.optional(v.boolean()), // hidden admins never appear in any user-facing list
    banned: v.optional(v.boolean()), // banned by admin — can appeal
    banReason: v.optional(v.string()),
    banUntil: v.optional(v.number()), // epoch ms; absent = permanent until unbanned/appeal accepted
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  courses: defineTable({
    title: v.string(),
    description: v.string(),
    thumbnail: v.optional(v.union(v.string(), v.null())),
    isPublished: v.boolean(),
    certRule: v.string(), // NONE | ALL_LESSONS | EXAM_PASS | LESSONS_AND_EXAM | ALL_TASKS
    certExamId: v.optional(v.union(v.id("exams"), v.null())),
    certTitle: v.optional(v.union(v.string(), v.null())),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  units: defineTable({
    title: v.string(),
    order: v.number(),
    courseId: v.id("courses"),
  }).index("by_course", ["courseId"]),

  lessons: defineTable({
    title: v.string(),
    type: v.string(), // VIDEO | PDF | TEXT | IMAGE
    content: v.string(),
    order: v.number(),
    unitId: v.id("units"),
    createdAt: v.number(),
  }).index("by_unit", ["unitId"]),

  lessonProgress: defineTable({
    userId: v.id("users"),
    lessonId: v.id("lessons"),
    completedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_lesson", ["userId", "lessonId"])
    .index("by_lesson", ["lessonId"]),

  enrollments: defineTable({
    userId: v.id("users"),
    courseId: v.id("courses"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_course", ["userId", "courseId"])
    .index("by_course", ["courseId"]),

  assignments: defineTable({
    title: v.string(),
    description: v.string(),
    courseId: v.id("courses"),
    dueDate: v.optional(v.union(v.number(), v.null())),
    maxScore: v.number(),
    allowFile: v.boolean(),
    allowText: v.boolean(),
    isPublished: v.boolean(),
    createdAt: v.number(),
  }).index("by_course", ["courseId"]),

  submissions: defineTable({
    assignmentId: v.id("assignments"),
    userId: v.id("users"),
    content: v.string(),
    fileUrl: v.optional(v.union(v.string(), v.null())),
    score: v.optional(v.union(v.number(), v.null())),
    feedback: v.optional(v.union(v.string(), v.null())),
    status: v.string(), // SUBMITTED | GRADED
    submittedAt: v.number(),
    gradedAt: v.optional(v.union(v.number(), v.null())),
  })
    .index("by_assignment", ["assignmentId"])
    .index("by_user", ["userId"])
    .index("by_assignment_user", ["assignmentId", "userId"]),

  exams: defineTable({
    title: v.string(),
    description: v.string(),
    courseId: v.optional(v.union(v.id("courses"), v.null())), // null → standalone exam (not tied to a course)
    durationMin: v.number(),
    openAt: v.optional(v.union(v.number(), v.null())),
    closeAt: v.optional(v.union(v.number(), v.null())),
    passScore: v.number(),
    maxViolations: v.number(),
    shuffleQuestions: v.boolean(),
    showResults: v.boolean(),
    isPublished: v.boolean(),
    accessToken: v.string(),
    createdAt: v.number(),
  })
    .index("by_course", ["courseId"])
    .index("by_token", ["accessToken"]),

  questions: defineTable({
    examId: v.id("exams"),
    text: v.string(),
    type: v.string(), // MCQ | TRUE_FALSE
    options: v.string(), // JSON array string
    correct: v.string(),
    marks: v.number(),
    order: v.number(),
  }).index("by_exam", ["examId"]),

  attempts: defineTable({
    examId: v.id("exams"),
    userId: v.id("users"),
    startedAt: v.number(),
    finishedAt: v.optional(v.union(v.number(), v.null())),
    score: v.optional(v.union(v.number(), v.null())),
    totalMarks: v.optional(v.union(v.number(), v.null())),
    percentage: v.optional(v.union(v.number(), v.null())),
    passed: v.optional(v.union(v.boolean(), v.null())),
    status: v.string(), // IN_PROGRESS | SUBMITTED | AUTO_SUBMITTED
    violations: v.string(), // JSON array string
    violationCount: v.number(),
    autoSubmitted: v.boolean(),
  })
    .index("by_exam", ["examId"])
    .index("by_user", ["userId"])
    .index("by_exam_user", ["examId", "userId"]),

  answers: defineTable({
    attemptId: v.id("attempts"),
    questionId: v.id("questions"),
    answer: v.optional(v.union(v.string(), v.null())),
    isCorrect: v.boolean(),
  })
    .index("by_attempt", ["attemptId"])
    .index("by_attempt_question", ["attemptId", "questionId"]),

  certificates: defineTable({
    serial: v.string(),
    userId: v.id("users"),
    courseId: v.optional(v.union(v.id("courses"), v.null())),
    title: v.string(),
    reason: v.string(),
    score: v.optional(v.union(v.number(), v.null())),
    issuedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_serial", ["serial"])
    .index("by_user_course", ["userId", "courseId"]),

  posts: defineTable({
    title: v.string(),
    content: v.string(),
    userId: v.id("users"),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  comments: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_post", ["postId"])
    .index("by_user", ["userId"]),

  dictionaryWords: defineTable({
    arabic: v.string(),
    english: v.string(),
    description: v.string(),
    createdAt: v.number(),
  }),

  files: defineTable({
    storageId: v.id("_storage"),
    name: v.string(),
    contentType: v.string(),
    size: v.number(),
    uploadedAt: v.number(),
  }),

  // emails blocked by the admin: a deleted user can never sign up again
  // (Google OAuth or email/password) until the admin unblocks them.
  blockedEmails: defineTable({
    email: v.string(),
    name: v.optional(v.union(v.string(), v.null())),
    reason: v.optional(v.string()),
    blockedAt: v.number(),
  }).index("by_email", ["email"]),

  // appeal requests (طعن) sent by banned/blocked users — admin accepts or rejects
  appeals: defineTable({
    userId: v.optional(v.id("users")), // present when the banned account still exists
    email: v.string(),
    message: v.string(),
    status: v.string(), // PENDING | ACCEPTED | REJECTED
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  // key/value app settings (community lock state, etc.)
  appSettings: defineTable({
    key: v.string(),
    locked: v.optional(v.boolean()),
  }).index("by_key", ["key"]),
});
