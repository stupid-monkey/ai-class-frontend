import service from './request';
export const adminLogin = (data: any) => service.post('/api/auth/admin/login', data);
export const downloadBaseInfoTemplate = () => service.get('/api/baseinfo/template', { responseType: 'blob' });
export const validateBaseInfoFile = (data: FormData) => service.post('/api/baseinfo/import/check', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const importBaseInfoFile = (data: FormData) => service.post('/api/baseinfo/import', data, { headers: { 'Content-Type': 'multipart/form-data' } });
