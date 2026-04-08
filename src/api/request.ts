import axios from "axios";
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import router from "@/router";
//定义接口返回数据的格式
interface ApiResponse<T = any> {
    code: number,
    data: T,
    msg: string,
    [key: string]: any
}
const globalConfig = (window as any).GLOBAL_CONFIG || {};
let baseURL = globalConfig.API_BASE_URL || '/smartclassroom';

const service: AxiosInstance = axios.create({
    baseURL: baseURL,
    // 超时时间设置为180秒，AI 生成questions目可能需要较长时间处理
    timeout: 180000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        //ngrok 免费版需要添加这个头，否则会报错
        // "ngrok-skip-browser-warning": "69420"
        // 'Content-Type': 'application/json; charset=utf-8'
    }
})

//请求拦截器
service.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // 从 localStorage 中获取 token
        const token = localStorage.getItem('token');
        if (token && config.headers) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        // 单独部署模式的 token（优先级更高）
        const viewerToken = (window as any).GLOBAL_CONFIG?.VIEWER_TOKEN;
        if(viewerToken && config.headers) {
            console.log('独立部署模式');
            config.headers["token"] = viewerToken;
        }

        if (config.data instanceof FormData) {
            // 在 Axios 中上传 FormData，必须删除所有 Content-Type 设置
            // 以便让浏览器能够自动添加带有正确 boundary 的 multipart/form-data 头
            if (config.headers) {
                delete config.headers['Content-Type'];
                delete config.headers['content-type'];
            }
        }
        
        return config
    },
    (error: any) => {
        return Promise.reject(error)
    }
)

//响应拦截器
service.interceptors.response.use(
    (response: AxiosResponse<ApiResponse>) => {
        // 如果响应是 blob 文件流，直接返回原始 response
        if (response.config.responseType === 'blob' || response.config.responseType === 'arraybuffer') {
            return response as any;
        }

        try {
            const res = response.data
            
            // 检查响应数据是否有效
            if (!res || typeof res.code === 'undefined') {
                console.warn('响应数据格式异常:', res)
                return res as any
            }
            
            // 判断业务Status：code 为 200 或 0 或 1000 等为成功
            const isSuccess = [200, 0, 1000].includes(res.code)
            
            if (!isSuccess) {
                // 处理业务错误
                const errorMsg = res.msg || res.message || '请求失败'
                console.error('业务错误:', res.code, errorMsg)
                
                // 检测登录Status失效：code 401 或 61002（登录Status已失效）
                if (res.code === 401 || res.code === 61002 || errorMsg.includes('未登录') || errorMsg.includes('未授权') || errorMsg.includes('登录Status已失效')) {
                    const isViewerMode = !!(window as any).GLOBAL_CONFIG?.VIEWER_TOKEN;
                    
                    if (!isViewerMode) {
                        // 防止死循环：如果已经在登录页，就不再执行重定向
                        if (!window.location.hash.includes('/login') && !window.location.pathname.includes('/login')) {
                            console.log('【调试】检测到登录Status失效，准备跳转到登录页')
                            
                            // 保存当前路由路径（用户登录后要返回这里）
                            const currentPath = window.location.hash || window.location.pathname
                            sessionStorage.setItem('redirectPath', currentPath)
                            console.log('【调试】已保存重定向路径:', currentPath)
                            
                            // 清除本地存储的 token 和用户信息
                            localStorage.removeItem('token');
                            localStorage.removeItem('userInfo');
                            localStorage.removeItem('role');
                            
                            // 注意：不清除 username 和 password，以便自动填充
                            
                            // 跳转到登录页
                            router.push({ 
                                path: '/login',
                                query: { redirect: currentPath }
                            });
                        }
                    }
                }
                return Promise.reject(new Error(errorMsg))
            }
            return res as any
        } catch (error: any) {
            console.error('响应拦截器异常:', error)
            return Promise.reject(error)
        }
    },
    (error: any) => {
        // 处理 HTTP 错误
        if (error.response) {
            const status = error.response.status
            const message = error.response.data?.msg || '请求错误'
            switch (status) {
                case 400:
                    console.error('请求参数错误:', message)
                    break
                case 401:
                    console.error('未授权，请重新登录')
                    // 清除本地存储的登录信息
                    localStorage.removeItem('token');
                    localStorage.removeItem('userInfo');
                    localStorage.removeItem('role');
                    // 在跳转前清除登录信息
                    router.push({ path: '/login' })
                    window.location.reload();
                    break
                case 403:
                    console.error('拒绝访问')

                    break
                case 404:
                    console.error('请求的资源不存在')
                    break
                case 500:
                    console.error('服务器错误')
                    break
                default:
                    console.error('未知错误')
            }
        } else if (error.request) {
            console.error(error.request)
            console.error('请求未响应，可能是网络问questions')
        } else {
            console.error('请求配置错误:', error.msg)
        }
        return Promise.reject(error)
    }
)
export default service
export type { ApiResponse }
export { baseURL }