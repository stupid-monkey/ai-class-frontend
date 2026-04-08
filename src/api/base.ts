import service from "@/api/request";
import { type ApiResponse, baseURL } from "@/api/request";


/**
 * GET 请求封装
 * @param url 接口地址
 * @param params 请求参数
 */
export function get<T>(url: string, params?: object): Promise<ApiResponse<T>> {
  return service.get( url, { params })
}

/**
 * POST 请求封装
 * @param url 接口地址
 * @param data 请求体数据
 */
export function post<T>(url: string, data?: object, params?: object,): Promise<ApiResponse<T>> {
  return service.post( url, data, { params })
}


// 临时调试工具
function debugFormData(fd: FormData) {
  console.log('--- FormData entries ---')
  for (const [k, v] of fd.entries()) {
    if (v instanceof File) {
      console.log(k, `File{name=${v.name}, size=${v.size}, type=${v.type}}`)
    } else {
      console.log(k, v)
    }
  }
  console.log('--- end ---')
}

/**
 * 上传文件 POST 请求封装
 * @param url 接口地址
 * @param formData 要上传的文件
 * @param data 额外的表单数据（可选）
 * @param params 查询参数（可选）
 */
export function uploadFile<T>(
  url: string,
  formData: FormData,
  data?: object,
  params?: object
): Promise<ApiResponse<T>> {
  if (data) {
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }
  //   debugFormData(formData) 
  return service.post(baseURL + url, formData, {
    params,
    // Content-Type 会由 interceptor 自动置空并由浏览器处理 boundary
  });
}


//PUT\DELETE等方法