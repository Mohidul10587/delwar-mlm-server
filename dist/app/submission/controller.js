"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubmissionProgress = exports.getTeacherSubmissions = exports.getStudentSubmissions = exports.resubmit = exports.updateStatus = exports.create = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const model_1 = require("./model");
const model_2 = require("../user/model");
const model_3 = require("../settings/model");
const model_4 = require("../wallet/model");
const model_5 = require("../transaction/model");
const create = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, courseId, classNumber, imageUrl, teacherId } = req.body;
        const settings = yield model_3.Settings.findOne();
        if (!settings) {
            return res.status(404).json({
                message: { en: "Settings not found", bn: "সেটিংস পাওয়া যায়নি" },
            });
        }
        const courseIndex = settings.courses.findIndex((c) => c._id.toString() === courseId.toString());
        if (courseIndex === -1) {
            return res.status(404).json({
                message: { en: "Course not found", bn: "কোর্স পাওয়া যায়নি" },
            });
        }
        if (courseIndex > 0) {
            const previousCourse = settings.courses[courseIndex - 1];
            const acceptedCount = yield model_1.Submission.countDocuments({
                studentId,
                courseId: previousCourse._id,
                status: "Accepted",
            });
            if (acceptedCount < 10) {
                return res.status(400).json({
                    message: {
                        en: `You must complete 10 accepted submissions in "${previousCourse.title}" before starting "${courseId}"`,
                        bn: `"${courseId}" শুরু করার আগে "${previousCourse.title}" এ ১০টি গৃহীত সাবমিশন সম্পূর্ণ করতে হবে`,
                    },
                });
            }
        }
        const student = yield model_2.User.findById(studentId);
        if (!student)
            return res.status(404).json({
                message: {
                    en: "Student not found.",
                    bn: "শিক্ষার্থী পাওয়া যায়নি।",
                },
            });
        // Block submission if previous class is not yet accepted
        if (classNumber > 1) {
            const prevClassAccepted = yield model_1.Submission.findOne({
                studentId,
                courseId,
                classNumber: classNumber - 1,
                status: "Accepted",
            });
            if (!prevClassAccepted) {
                return res.status(400).json({
                    message: {
                        en: `Class ${classNumber - 1} must be accepted before submitting class ${classNumber}.`,
                        bn: `ক্লাস ${classNumber} জমা দেওয়ার আগে ক্লাস ${classNumber - 1} গৃহীত হতে হবে।`,
                    },
                });
            }
        }
        const item = yield model_1.Submission.create({
            studentId,
            courseId,
            classNumber,
            imageUrl,
            teacherId,
            trainerId: student.trainer,
            teamLeaderId: student.teamLeader,
            seniorTeamLeaderId: student.seniorTeamLeader,
            status: "Pending",
        });
        res.status(201).json({
            message: {
                en: "Submission created successfully!",
                bn: "সাবমিশন সফলভাবে তৈরি হয়েছে!",
            },
            item,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.create = create;
const updateStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const item = yield model_1.Submission.findById(id);
        if (!item)
            return res.status(404).json({
                message: {
                    en: "Submission not found.",
                    bn: "সাবমিশন পাওয়া যায়নি।",
                },
            });
        const previousStatus = item.status;
        item.status = status;
        yield item.save();
        // Award system: Add award when status changes to Accepted
        if (status === "Accepted" && previousStatus !== "Accepted") {
            const settings = yield model_3.Settings.findOne();
            if (settings) {
                const course = settings.courses.find((c) => { var _a; return ((_a = c._id) === null || _a === void 0 ? void 0 : _a.toString()) === item.courseId.toString(); });
                if ((course === null || course === void 0 ? void 0 : course.isAwardEnabled) && course.awardValue > 0) {
                    const wallet = yield model_4.Wallet.findOne({ userId: item.studentId });
                    if (wallet) {
                        const prevBalance = wallet.earnedBalance;
                        wallet.earnedBalance += course.awardValue;
                        yield wallet.save();
                        yield model_5.Transaction.create({
                            userId: item.studentId,
                            previousAmount: prevBalance,
                            recentAmount: course.awardValue,
                            currentTotal: wallet.earnedBalance,
                            description: `Class ${item.classNumber} award for ${course.title}`,
                            type: "credit",
                        });
                    }
                }
            }
        }
        res.status(200).json({
            message: {
                en: "Status updated successfully!",
                bn: "স্ট্যাটাস আপডেট হয়েছে!",
            },
            item,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.updateStatus = updateStatus;
const resubmit = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { imageUrl } = req.body;
        const item = yield model_1.Submission.findById(id);
        if (!item)
            return res.status(404).json({
                message: {
                    en: "Submission not found.",
                    bn: "সাবমিশন পাওয়া যায়নি।",
                },
            });
        if (item.status !== "Rejected") {
            return res.status(400).json({
                message: {
                    en: "Only rejected submissions can be resubmitted.",
                    bn: "শুধুমাত্র প্রত্যাখ্যাত সাবমিশন পুনরায় জমা দেওয়া যায়।",
                },
            });
        }
        item.imageUrl = imageUrl;
        item.status = "Pending";
        yield item.save();
        res.status(200).json({
            message: {
                en: "Resubmitted successfully!",
                bn: "পুনরায় জমা দেওয়া হয়েছে!",
            },
            item,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.resubmit = resubmit;
const getStudentSubmissions = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const items = yield model_1.Submission.find({ studentId }).sort({ createdAt: -1 });
        res.status(200).json(items);
    }
    catch (error) {
        next(error);
    }
});
exports.getStudentSubmissions = getStudentSubmissions;
const getTeacherSubmissions = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { teacherId } = req.params;
        const items = yield model_1.Submission.find({
            $or: [
                { teacherId },
                { trainerId: teacherId },
                { teamLeaderId: teacherId },
                { seniorTeamLeaderId: teacherId },
            ],
        })
            .populate("studentId", "name userId phone image")
            .sort({ createdAt: -1 });
        res.status(200).json(items);
    }
    catch (error) {
        next(error);
    }
});
exports.getTeacherSubmissions = getTeacherSubmissions;
const getSubmissionProgress = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        const progress = yield model_1.Submission.aggregate([
            { $match: { studentId: new mongoose_1.default.Types.ObjectId(studentId) } },
            {
                $group: {
                    _id: "$courseId",
                    total: { $sum: 1 },
                    accepted: {
                        $sum: { $cond: [{ $eq: ["$status", "Accepted"] }, 1, 0] },
                    },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        res.status(200).json(progress);
    }
    catch (error) {
        next(error);
    }
});
exports.getSubmissionProgress = getSubmissionProgress;
