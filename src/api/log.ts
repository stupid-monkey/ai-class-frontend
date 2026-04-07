import { get, post } from './base'

// 通用登录
export const loginApi = (data: any) => post("/api/auth/login", data);

// 教师登录
export const teacherLoginApi = (data: any) => post("/api/auth/teacher/login", data);

// 学生登录
export const studentLoginApi = (data: any) => post("/api/auth/student/login", data);

// 验证Token有效性
export const verifyTokenApi = (token: string) => post("/api/auth/verify-token", {}, { token });

// 登出
export const logoutApi = (token: string) => post("/api/auth/logout", {}, { token });

// 修改密码
export const changePasswordApi = (data: any) => post("/api/auth/change-password", data);

// 刷新Token
export const refreshTokenApi = (token: string) => post("/api/auth/refresh-token", {}, { token });