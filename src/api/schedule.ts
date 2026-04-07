import { get, post } from './base'


// 1. 提交排课任务（输入端）
export const submitScheduleApi = (data: any) => post("/smartTimetable/schedule/submit", data);
export const getScheduleResultApi = (taskId: string,classId: string,date: string) => get("/smartTimetable/schedule/result", { taskId, classId, date });
export const getScheduleEvaluationApi = (taskId: string) => get("/smartTimetable/schedule/evaluation", { taskId });
export const chatApi = (data: any) => post("/smartTimetable/schedule/chat", data);
export const getsemesterResultApi = (taskId: string,classId: string) => get("/smartTimetable/schedule/actual-result", { taskId, classId });