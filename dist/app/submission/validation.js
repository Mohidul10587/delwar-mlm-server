"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStatusSchema = exports.createSubmissionSchema = void 0;
const zod_1 = require("zod");
exports.createSubmissionSchema = zod_1.z.object({
    studentId: zod_1.z.string().min(1, { message: JSON.stringify({ en: "Student ID is required", bn: "শিক্ষার্থী আইডি প্রয়োজন" }) }),
    courseId: zod_1.z.string().min(1, { message: JSON.stringify({ en: "Course ID is required", bn: "কোর্স আইডি প্রয়োজন" }) }),
    classNumber: zod_1.z.number().min(1, { message: JSON.stringify({ en: "Class number is required", bn: "ক্লাস নম্বর প্রয়োজন" }) }),
    imageUrl: zod_1.z.string().url({ message: JSON.stringify({ en: "Valid image URL is required", bn: "বৈধ ছবির URL প্রয়োজন" }) }),
    teacherId: zod_1.z.string().min(1, { message: JSON.stringify({ en: "Teacher ID is required", bn: "শিক্ষক আইডি প্রয়োজন" }) })
});
exports.updateStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(["Pending", "Accepted", "Rejected"])
});
